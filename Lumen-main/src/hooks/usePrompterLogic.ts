import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useVideoRecorder } from './useVideoRecorder';
import { useSpeechFollower } from './useSpeechFollower';
import { AudioRehearsalEngine } from '../utils/speechSynthesis';
import { beginAvCaptureFromUserGesture, getReadyAvStream, isMobileDevice } from '../utils/recordingCapture';
import { getSharedCameraStream } from '../utils/cameraStreamStore';
import { countWords, estimateDurationSeconds } from '../utils/prompterUtils';

export const usePrompterLogic = () => {
export const usePrompterLogic = () => {
  // Use granular selectors for stability
  const scripts = useStore(s => s.scripts || []);
  const activeScriptId = useStore(s => s.activeScriptId || '');
  const settings = useStore(s => s.settings || DEFAULT_SETTINGS);
  const playbackStatus = useStore(s => s.playbackStatus);
  const mode = useStore(s => s.mode);
  const countdownNumber = useStore(s => s.countdownNumber);
  const isAudioRehearsing = useStore(s => s.isAudioRehearsing);

  // Actions
  const setPlaybackStatus = useStore(s => s.setPlaybackStatus);
  const updateSettings = useStore(s => s.updateSettings);
  const setCountdownNumber = useStore(s => s.setCountdownNumber);
  const setIsAudioRehearsing = useStore(s => s.setIsAudioRehearsing);
  const setElapsedSeconds = useStore(s => s.setElapsedSeconds);
  const setVoiceBanner = useStore(s => s.setVoiceBanner);
  const setActiveScriptId = useStore(s => s.setActiveScriptId);
  const setMobileScreen = useStore(s => s.setMobileScreen);
  const setMode = useStore(s => s.setMode);
  const setIsFullscreen = useStore(s => s.setIsFullscreen);
  const setRecordingModalOpen = useStore(s => s.setRecordingModalOpen);
  const updateScript = useStore(s => s.updateScript);
  const addScript = useStore(s => s.addScript);

  const scriptsList = scripts;
  const activeScript = scriptsList.find((s) => s.id === activeScriptId) || scriptsList[0];
  const currentSettings = settings;

  const wordCount = countWords(activeScript?.content || '');
  const totalEstimatedSeconds = estimateDurationSeconds(wordCount, currentSettings.wpm);

  // Video Recorder Hook
  const recorder = useVideoRecorder({
    scriptTitle: activeScript?.title,
    scriptId: activeScript?.id,
    onRecordingFinished: () => {
      setRecordingModalOpen(true);
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
      updateSettings({ speechTracking: false });
    },
    onUnsupported: (message) => {
      updateSettings({ speechTracking: false });
      setVoiceBanner(message);
      window.setTimeout(() => setVoiceBanner(null), 7000);
    },
  });

  const { resetVoiceTracking, startFromUserGesture } = speechFollower;

  const handleToggleVoice = useCallback(() => {
    const { settings: current } = useStore.getState();
    if (current.speechTracking) {
      setVoiceBanner(null);
      updateSettings({ speechTracking: false });
      return;
    }
    setVoiceBanner('Voz ON — habla el texto y el teleprompter avanzará');
    window.setTimeout(() => setVoiceBanner(null), 3500);
    updateSettings({ speechTracking: true });
    startFromUserGesture();
  }, [updateSettings, setVoiceBanner, startFromUserGesture]);

  // Sync voice tracking state
  useEffect(() => {
    if (currentSettings.speechTracking && playbackStatus === 'playing') {
      setPlaybackStatus('paused');
    }
    if (!currentSettings.speechTracking) {
      resetVoiceTracking();
      setLastVoiceWord('');
    }
  }, [currentSettings.speechTracking, playbackStatus, setPlaybackStatus, resetVoiceTracking]);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownNumber(null);
  }, [setCountdownNumber]);

  // Playback timer ticker - STABLE REFERENCE
  useEffect(() => {
    let timer: any;
    if (playbackStatus === 'playing') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playbackStatus, setElapsedSeconds]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  const beginPlayAndRecord = useCallback(async () => {
    const { mode: currentMode, settings: currentSettings } = useStore.getState();
    if (!currentSettings.cameraOverlay && currentMode !== 'camera') {
      updateSettings({ cameraOverlay: true });
    }

    setPlaybackStatus('playing');
    try {
      await startRecording(undefined, { videoOnly: false });
    } catch (err) {
      console.warn('startRecording failed; teleprompter keeps playing:', err);
    }
  }, [updateSettings, setPlaybackStatus, startRecording]);

  const handleTogglePlay = useCallback((prefetchedAv?: Promise<MediaStream>) => {
    const { playbackStatus: currentStatus, settings: currentSettings } = useStore.getState();

    if (currentStatus === 'countdown') {
      clearCountdown();
      setPlaybackStatus('idle');
      return;
    }

    if (currentStatus === 'playing') {
      setPlaybackStatus('paused');
      if (isRecordingRef.current) {
        stopRecording();
      }
      return;
    }

    const avPromise = prefetchedAv ?? beginAvCaptureFromUserGesture();

    updateSettings({
      cameraOverlay: true,
      cameraLayout: currentSettings.cameraLayout || 'pip',
    });

    AudioRehearsalEngine.stop();
    setIsAudioRehearsing(false);

    void (async () => {
      await adoptAvPromise(avPromise);

      const hasVideo =
        !!getSharedCameraStream()?.getVideoTracks().some((t) => t.readyState === 'live') ||
        !!getReadyAvStream();

      const latestSettings = useStore.getState().settings;
      if (latestSettings.countdownSeconds > 0 && currentStatus === 'idle') {
        clearCountdown();
        setPlaybackStatus('countdown');
        let currentCount = latestSettings.countdownSeconds;
        setCountdownNumber(currentCount);

        countdownIntervalRef.current = setInterval(() => {
          currentCount -= 1;
          if (currentCount > 0) {
            setCountdownNumber(currentCount);
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
    clearCountdown,
    setPlaybackStatus,
    updateSettings,
    setIsAudioRehearsing,
    adoptAvPromise,
    setCountdownNumber,
    beginPlayAndRecord,
    stopRecording,
  ]);

  const handleRestart = useCallback(() => {
    clearCountdown();
    if (isRecordingRef.current) {
      stopRecording();
    }
    setPlaybackStatus('idle');
    setElapsedSeconds(0);
    resetVoiceTracking();
    AudioRehearsalEngine.stop();
    setIsAudioRehearsing(false);

    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      canvasScroller.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [clearCountdown, stopRecording, setPlaybackStatus, setElapsedSeconds, resetVoiceTracking, setIsAudioRehearsing]);

  const handleNudgeForward = useCallback(() => {
    const { settings: current } = useStore.getState();
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      const jumpPx = (current.fontSize * current.lineHeight * 6);
      canvasScroller.scrollBy({ top: jumpPx, behavior: 'smooth' });
    }
  }, []);

  const handleNudgeBackward = useCallback(() => {
    const { settings: current } = useStore.getState();
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      const jumpPx = (current.fontSize * current.lineHeight * 6);
      canvasScroller.scrollBy({ top: -jumpPx, behavior: 'smooth' });
    }
  }, []);

  const handleToggleAudioRehearsal = useCallback(() => {
    const state = useStore.getState();
    const isRehearsing = state.isAudioRehearsing;
    const currentScripts = state.scripts || [];
    const scriptId = state.activeScriptId;
    const currentScript = currentScripts.find(s => s.id === scriptId) || currentScripts[0];

    if (isRehearsing) {
      AudioRehearsalEngine.stop();
      setIsAudioRehearsing(false);
    } else {
      if (!currentScript) return;
      setIsAudioRehearsing(true);
      AudioRehearsalEngine.speak(
        currentScript.content,
        state.settings.wpm,
        undefined,
        () => setIsAudioRehearsing(false)
      );
    }
  }, [setIsAudioRehearsing]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  }, [setIsFullscreen]);

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
