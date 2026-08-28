import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useVideoRecorder } from './useVideoRecorder';
import { useSpeechFollower } from './useSpeechFollower';
import { AudioRehearsalEngine } from '../utils/speechSynthesis';
import { beginAvCaptureFromUserGesture, getReadyAvStream, isMobileDevice } from '../utils/recordingCapture';
import { getSharedCameraStream } from '../utils/cameraStreamStore';
import { countWords, estimateDurationSeconds } from '../utils/prompterUtils';

export const usePrompterLogic = () => {
  const store = useStore();
  const {
    scripts = [],
    activeScriptId = '',
    settings,
    playbackStatus = 'idle',
    mode = 'studio',
    countdownNumber = null,
    isAudioRehearsing = false,
    setPlaybackStatus,
    updateSettings,
    setCountdownNumber,
    setIsAudioRehearsing,
    setElapsedSeconds,
    setVoiceBanner,
    setActiveScriptId,
    setMobileScreen,
    setMode,
  } = store;

  const scriptsList = scripts || [];
  const activeScript = scriptsList.find((s) => s.id === activeScriptId) || scriptsList[0];
  const currentSettings = settings || { wpm: 135, fontSize: 48, lineHeight: 1.35, speechTracking: false, cameraOverlay: true, countdownSeconds: 5 };

  const wordCount = countWords(activeScript?.content || '');
  const totalEstimatedSeconds = estimateDurationSeconds(wordCount, currentSettings.wpm);

  // Video Recorder Hook
  const recorder = useVideoRecorder({
    scriptTitle: activeScript?.title,
    scriptId: activeScript?.id,
    onRecordingFinished: () => {
      store.setRecordingModalOpen(true);
    },
  });

  const { isRecording = false, startRecording, stopRecording, adoptAvPromise } = recorder;

  // Speech Recognition Follower integration
  const [voiceProgressRatio, setVoiceProgressRatio] = useState<number>(0);
  const [voiceWordIndex, setVoiceWordIndex] = useState<number>(0);
  const [lastVoiceWord, setLastVoiceWord] = useState<string>('');

  const handleVoiceProgress = useCallback((ratio: number, matchedWord: string, wordIndex: number) => {
    setVoiceProgressRatio(ratio);
    setLastVoiceWord(matchedWord);
    setVoiceWordIndex(wordIndex);
  }, []);

  const speechFollower = useSpeechFollower({
    enabled: !!currentSettings.speechTracking,
    scriptContent: activeScript?.content || '',
    onMatchProgress: handleVoiceProgress,
    suspended: isRecording || playbackStatus === 'countdown',
    onPermissionDenied: () => {
      store.updateSettings({ speechTracking: false });
    },
    onUnsupported: (message) => {
      store.updateSettings({ speechTracking: false });
      setVoiceBanner(message);
      window.setTimeout(() => setVoiceBanner(null), 7000);
    },
  });

  const { resetVoiceTracking, startFromUserGesture } = speechFollower;

  const handleToggleVoice = useCallback(() => {
    if (currentSettings.speechTracking) {
      setVoiceBanner(null);
      store.updateSettings({ speechTracking: false });
      return;
    }
    setVoiceBanner('Voz ON — habla el texto y el teleprompter avanzará');
    window.setTimeout(() => setVoiceBanner(null), 3500);
    store.updateSettings({ speechTracking: true });
    startFromUserGesture();
  }, [currentSettings.speechTracking, startFromUserGesture, store, setVoiceBanner]);

  // Sync voice tracking state
  useEffect(() => {
    if (currentSettings.speechTracking && playbackStatus === 'playing') {
      store.setPlaybackStatus('paused');
    }
    if (!currentSettings.speechTracking) {
      resetVoiceTracking();
      setLastVoiceWord('');
    }
  }, [currentSettings.speechTracking, playbackStatus, store, resetVoiceTracking]);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    store.setCountdownNumber(null);
  }, [store]);

  // Playback timer ticker
  useEffect(() => {
    let timer: any;
    if (playbackStatus === 'playing') {
      timer = setInterval(() => {
        store.setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playbackStatus, store]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  const beginPlayAndRecord = useCallback(async () => {
    if (!currentSettings.cameraOverlay && mode !== 'camera') {
      store.updateSettings({ cameraOverlay: true });
    }

    store.setPlaybackStatus('playing');
    try {
      await startRecording(undefined, { videoOnly: false });
    } catch (err) {
      console.warn('startRecording failed; teleprompter keeps playing:', err);
    }
  }, [currentSettings.cameraOverlay, mode, startRecording, store]);

  const handleTogglePlay = useCallback((prefetchedAv?: Promise<MediaStream>) => {
    if (playbackStatus === 'countdown') {
      clearCountdown();
      store.setPlaybackStatus('idle');
      return;
    }

    if (playbackStatus === 'playing') {
      store.setPlaybackStatus('paused');
      if (isRecordingRef.current) {
        stopRecording();
      }
      return;
    }

    const avPromise = prefetchedAv ?? beginAvCaptureFromUserGesture();

    store.updateSettings({
      cameraOverlay: true,
      cameraLayout: currentSettings.cameraLayout || 'pip',
    });

    AudioRehearsalEngine.stop();
    store.setIsAudioRehearsing(false);

    void (async () => {
      await adoptAvPromise(avPromise);

      const hasVideo =
        !!getSharedCameraStream()?.getVideoTracks().some((t) => t.readyState === 'live') ||
        !!getReadyAvStream();

      if (currentSettings.countdownSeconds > 0 && playbackStatus === 'idle') {
        clearCountdown();
        store.setPlaybackStatus('countdown');
        let currentCount = currentSettings.countdownSeconds;
        store.setCountdownNumber(currentCount);

        countdownIntervalRef.current = setInterval(() => {
          currentCount -= 1;
          if (currentCount > 0) {
            store.setCountdownNumber(currentCount);
          } else {
            clearCountdown();
            void beginPlayAndRecord();
          }
        }, 1000);
      } else {
        await beginPlayAndRecord();
      }

      if (!hasVideo) {
        console.warn('Iniciar without live camera; teleprompter still runs');
      }
    })();
  }, [
    playbackStatus,
    currentSettings.countdownSeconds,
    currentSettings.cameraLayout,
    clearCountdown,
    adoptAvPromise,
    beginPlayAndRecord,
    stopRecording,
    store,
  ]);

  const handleRestart = useCallback(() => {
    clearCountdown();
    if (isRecordingRef.current) {
      stopRecording();
    }
    store.setPlaybackStatus('idle');
    store.setElapsedSeconds(0);
    resetVoiceTracking();
    AudioRehearsalEngine.stop();
    store.setIsAudioRehearsing(false);

    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      canvasScroller.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [resetVoiceTracking, clearCountdown, stopRecording, store]);

  const handleNudgeForward = useCallback(() => {
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      const jumpPx = (currentSettings.fontSize * currentSettings.lineHeight * 6);
      canvasScroller.scrollBy({ top: jumpPx, behavior: 'smooth' });
    }
  }, [currentSettings.fontSize, currentSettings.lineHeight]);

  const handleNudgeBackward = useCallback(() => {
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      const jumpPx = (currentSettings.fontSize * currentSettings.lineHeight * 6);
      canvasScroller.scrollBy({ top: -jumpPx, behavior: 'smooth' });
    }
  }, [currentSettings.fontSize, currentSettings.lineHeight]);

  const handleToggleAudioRehearsal = useCallback(() => {
    if (isAudioRehearsing) {
      AudioRehearsalEngine.stop();
      store.setIsAudioRehearsing(false);
    } else {
      if (!activeScript) return;
      store.setIsAudioRehearsing(true);
      AudioRehearsalEngine.speak(
        activeScript.content,
        currentSettings.wpm,
        undefined,
        () => store.setIsAudioRehearsing(false)
      );
    }
  }, [isAudioRehearsing, activeScript, currentSettings.wpm, store]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
      store.setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      store.setIsFullscreen(false);
    }
  }, [store]);

  const handleToggleRecord = useCallback(() => {
    handleTogglePlay();
  }, [handleTogglePlay]);

  return {
    activeScript,
    wordCount,
    totalEstimatedSeconds,
    recorder,
    speechFollower,
    voiceProgressRatio,
    voiceWordIndex,
    lastVoiceWord,
    handleToggleVoice,
    handleTogglePlay,
    handleRestart,
    handleNudgeForward,
    handleNudgeBackward,
    handleToggleAudioRehearsal,
    handleToggleFullscreen,
    handleToggleRecord,
  };
};
