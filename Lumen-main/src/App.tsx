import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PrompterMode, 
  PrompterSettings, 
  PlaybackStatus, 
  Script 
} from './types';
import { PRESET_SCRIPTS } from './data/presetScripts';
import { HeaderNav } from './components/HeaderNav';
import { StudioEditor } from './components/StudioEditor';
import { PrompterCanvas } from './components/PrompterCanvas';
import { ControlOverlay } from './components/ControlOverlay';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { ScriptsLibraryModal } from './components/ScriptsLibraryModal';
import { RecordingModal } from './components/RecordingModal';
import { DonationModal } from './components/DonationModal';
import { UserManualModal } from './components/UserManualModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileMoreSheet } from './components/MobileMoreSheet';
import { useSpeechFollower } from './hooks/useSpeechFollower';
import { useVideoRecorder } from './hooks/useVideoRecorder';
import { countWords, estimateDurationSeconds } from './utils/prompterUtils';
import { AudioRehearsalEngine } from './utils/speechSynthesis';
import { beginAvCaptureFromUserGesture, isMobileDevice } from './utils/recordingCapture';
import { Play, Pause } from 'lucide-react';

const STORAGE_KEY_SCRIPTS = 'lumen_teleprompter_scripts_v1';
const STORAGE_KEY_SETTINGS = 'lumen_teleprompter_settings_v1';

const DEFAULT_SETTINGS: PrompterSettings = {
  wpm: 135,
  fontSize: 48,
  lineHeight: 1.35,
  safeMargin: 12,
  mirrorX: false,
  mirrorY: false,
  textColor: '#ffffff',
  bgColor: '#000000',
  readerLineStyle: 'bar',
  readerLinePosition: 35,
  readerLineColor: '#00d1ff',
  countdownSeconds: 5,
  cameraOverlay: false,
  cameraLayout: 'pip',
  cameraPosition: 'left',
  cameraMirror: true,
  cameraFramingGuides: true,
  cameraOpacity: 0.35,
  speechTracking: false,
  focusDim: false,
  autoHideControls: false,
  showWordCount: true,
  showTimer: true,
  showProgressBar: true,
  fontFamily: 'Inter',
};

export default function App() {
  // Scripts state with LocalStorage persistence
  const [scripts, setScripts] = useState<Script[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCRIPTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved scripts:', e);
    }
    return PRESET_SCRIPTS;
  });

  const [activeScriptId, setActiveScriptId] = useState<string>(() => {
    return scripts[0]?.id || 'keynote-launch';
  });

  // Settings state with LocalStorage persistence
  const [settings, setSettings] = useState<PrompterSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        // Nunca auto-activar voz al cargar: en móvil el ASR sin gesto del usuario
        // dispara "not-allowed" y muestra el error rojo.
        loaded.speechTracking = false;
        // Móvil: no restaurar cámara encendida (getUserMedia sin toque = NotAllowed).
        if (
          typeof navigator !== 'undefined' &&
          (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
        ) {
          loaded.cameraOverlay = false;
        }
        return loaded;
      }
    } catch (e) {
      console.warn('Failed to load saved settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Active Modes & Status
  const [mode, setMode] = useState<PrompterMode>('studio');
  const [mobileScreen, setMobileScreen] = useState<'editor' | 'prompter' | 'library'>('editor');
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [isAudioRehearsing, setIsAudioRehearsing] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Save scripts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCRIPTS, JSON.stringify(scripts));
    } catch (e) {
      console.warn('Failed to save scripts:', e);
    }
  }, [scripts]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, [settings]);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const wordCount = countWords(activeScript?.content || '');
  const totalEstimatedSeconds = estimateDurationSeconds(wordCount, settings.wpm);

  // Video Recorder Hook
  const {
    isRecording,
    recordingSeconds,
    latestTake,
    takesHistory,
    recorderError,
    clearRecorderError,
    adoptAvPromise,
    prepareMicForRecording,
    startRecording,
    stopRecording,
    deleteTakeFromHistory,
    clearAllTakes,
  } = useVideoRecorder({
    scriptTitle: activeScript?.title,
    scriptId: activeScript?.id,
    onRecordingFinished: () => {
      setIsRecordingModalOpen(true);
    },
  });

  // Speech Recognition Follower integration
  const [voiceProgressRatio, setVoiceProgressRatio] = useState<number>(0);
  const [voiceWordIndex, setVoiceWordIndex] = useState<number>(0);
  const [lastVoiceWord, setLastVoiceWord] = useState<string>('');

  const [voiceBanner, setVoiceBanner] = useState<string | null>(null);

  const handleVoiceProgress = useCallback((ratio: number, matchedWord: string, wordIndex: number) => {
    setVoiceProgressRatio(ratio);
    setLastVoiceWord(matchedWord);
    setVoiceWordIndex(wordIndex);
  }, []);

  const { isListening, lastTranscript, error: voiceError, resetVoiceTracking } = useSpeechFollower({
    enabled: settings.speechTracking,
    scriptContent: activeScript?.content || '',
    onMatchProgress: handleVoiceProgress,
    suspended: isRecording || playbackStatus === 'countdown' || playbackStatus === 'playing',
    onPermissionDenied: () => {
      setSettings((prev) => ({ ...prev, speechTracking: false }));
    },
    onUnsupported: (message) => {
      setSettings((prev) => ({ ...prev, speechTracking: false }));
      setVoiceBanner(message);
      window.setTimeout(() => setVoiceBanner(null), 7000);
    },
  });

  const handleToggleVoice = useCallback(() => {
    setSettings((s) => {
      const next = !s.speechTracking;
      if (next) {
        // En iPhone no activamos el flag: mensaje amigable sin “ve a Chrome”
        const isIPhone =
          /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIPhone) {
          setVoiceBanner(
            'En iPhone el modo Voz no está disponible. Usa Iniciar y ajusta la velocidad (WPM).'
          );
          window.setTimeout(() => setVoiceBanner(null), 6000);
          return s;
        }
        setVoiceBanner('Voz ON — habla el texto y el teleprompter avanzará');
        window.setTimeout(() => setVoiceBanner(null), 3500);
      } else {
        setVoiceBanner(null);
      }
      return { ...s, speechTracking: next };
    });
  }, []);

  // When enabling voice tracking, pause WPM auto-scroll so the mic drives movement
  useEffect(() => {
    if (settings.speechTracking && playbackStatus === 'playing') {
      setPlaybackStatus('paused');
    }
    if (!settings.speechTracking) {
      resetVoiceTracking();
      setLastVoiceWord('');
      // No forzar voiceWordIndex/progress a 0 aquí: evita salto visual al top
    }
  }, [settings.speechTracking]); // eslint-disable-line react-hooks/exhaustive-deps

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownNumber(null);
  }, []);

  // Playback timer ticker
  useEffect(() => {
    let timer: any;
    if (playbackStatus === 'playing') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playbackStatus]);

  useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  /** Tras prepare: solo arranca MediaRecorder (el AV ya está abierto). */
  const beginPlayAndRecord = useCallback(async () => {
    if (!settings.cameraOverlay && mode !== 'camera') {
      setSettings((prev) => ({ ...prev, cameraOverlay: true }));
    }

    const started = await startRecording(undefined, { videoOnly: false });
    setPlaybackStatus(started ? 'playing' : 'paused');
  }, [settings.cameraOverlay, mode, startRecording]);

  const handleTogglePlay = useCallback((prefetchedAv?: Promise<MediaStream>) => {
    if (playbackStatus === 'countdown') {
      clearCountdown();
      setPlaybackStatus('idle');
      return;
    }

    if (playbackStatus === 'playing') {
      setPlaybackStatus('paused');
      if (isRecordingRef.current) {
        stopRecording();
      }
      return;
    }

    // Preferir la Promise disparada en el onClick del botón Iniciar.
    const avPromise = prefetchedAv ?? beginAvCaptureFromUserGesture();

    // Siempre mostrar el marco de cámara al iniciar (como al activarla en Ajustes).
    setSettings((prev) => ({
      ...prev,
      cameraOverlay: true,
      cameraLayout: prev.cameraLayout || 'pip',
    }));

    AudioRehearsalEngine.stop();
    setIsAudioRehearsing(false);

    void (async () => {
      const ready = await adoptAvPromise(avPromise);
      if (!ready) {
        setPlaybackStatus('idle');
        // No apagar cameraOverlay: el preview debe quedarse visible.
        return;
      }

      if (settings.countdownSeconds > 0 && playbackStatus === 'idle') {
        clearCountdown();
        setPlaybackStatus('countdown');
        let currentCount = settings.countdownSeconds;
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
    })();
  }, [
    playbackStatus,
    settings.countdownSeconds,
    clearCountdown,
    adoptAvPromise,
    beginPlayAndRecord,
    stopRecording,
  ]);

  // Restart to top
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
  }, [resetVoiceTracking, clearCountdown, stopRecording]);

  // Nudge forward / backward 5s
  const handleNudgeForward = useCallback(() => {
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      const jumpPx = (settings.fontSize * settings.lineHeight * 6);
      canvasScroller.scrollBy({ top: jumpPx, behavior: 'smooth' });
    }
  }, [settings.fontSize, settings.lineHeight]);

  const handleNudgeBackward = useCallback(() => {
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      const jumpPx = (settings.fontSize * settings.lineHeight * 6);
      canvasScroller.scrollBy({ top: -jumpPx, behavior: 'smooth' });
    }
  }, [settings.fontSize, settings.lineHeight]);

  // Audio Rehearsal TTS
  const handleToggleAudioRehearsal = useCallback(() => {
    if (isAudioRehearsing) {
      AudioRehearsalEngine.stop();
      setIsAudioRehearsing(false);
    } else {
      if (!activeScript) return;
      setIsAudioRehearsing(true);
      AudioRehearsalEngine.speak(
        activeScript.content,
        settings.wpm,
        undefined,
        () => setIsAudioRehearsing(false)
      );
    }
  }, [isAudioRehearsing, activeScript, settings.wpm]);

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  }, []);

  // Record button = same as play (unified start). Kept for shortcuts / legacy callers.
  const handleToggleRecord = useCallback(() => {
    handleTogglePlay();
  }, [handleTogglePlay]);

  // Update Settings Partial
  const handleUpdateSettings = useCallback((newSettings: Partial<PrompterSettings>) => {
    // Si en móvil activan la cámara desde Ajustes, pedir AV en este mismo toque.
    if (newSettings.cameraOverlay === true && isMobileDevice()) {
      const avPromise = beginAvCaptureFromUserGesture();
      void adoptAvPromise(avPromise).then((ok) => {
        if (!ok) {
          setSettings((prev) => ({ ...prev, cameraOverlay: false }));
          return;
        }
        setSettings((prev) => ({
          ...prev,
          ...newSettings,
          cameraOverlay: true,
          cameraLayout: newSettings.cameraLayout || prev.cameraLayout || 'pip',
        }));
      });
      return;
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, [adoptAvPromise]);

  // Script management handlers
  const handleUpdateScript = (updatedScript: Script) => {
    setScripts((prev) => prev.map((s) => (s.id === updatedScript.id ? updatedScript : s)));
  };

  const handleCreateScript = () => {
    const newScript: Script = {
      id: `script-${Date.now()}`,
      title: `Nuevo Guión ${scripts.length + 1}`,
      category: 'General',
      targetWPM: 135,
      content: `[MIRAR FIJAMENTE A CÁMARA]\nHola a todos. Bienvenidos a esta sesión.\n\n[PAUSA 2s]\nEscribe aquí tu discurso...`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setScripts((prev) => [newScript, ...prev]);
    setActiveScriptId(newScript.id);
  };

  const handleDeleteScript = (id: string) => {
    if (scripts.length <= 1) return;
    const remaining = scripts.filter((s) => s.id !== id);
    setScripts(remaining);
    setActiveScriptId(remaining[0].id);
  };

  const handleCloneScript = (script: Script) => {
    const cloned: Script = {
      ...script,
      id: `script-${Date.now()}`,
      title: `${script.title} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setScripts((prev) => [cloned, ...prev]);
    setActiveScriptId(cloned.id);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, wpm: Math.min(320, prev.wpm + 5) }));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setSettings((prev) => ({ ...prev, wpm: Math.max(10, prev.wpm - 5) }));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleNudgeBackward();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNudgeForward();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRestart();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.key === 'm' || e.key === 'M') {
        setSettings((prev) => ({ ...prev, mirrorX: !prev.mirrorX }));
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        setSettings((prev) => ({ ...prev, cameraOverlay: !prev.cameraOverlay }));
      } else if (e.key === 'v' || e.key === 'V') {
        handleToggleVoice();
      } else if (e.key === '+' || e.key === '=') {
        setSettings((prev) => ({ ...prev, fontSize: Math.min(120, prev.fontSize + 2) }));
      } else if (e.key === '-' || e.key === '_') {
        setSettings((prev) => ({ ...prev, fontSize: Math.max(20, prev.fontSize - 2) }));
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsAIOpen(false);
        setIsLibraryOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleRestart, handleNudgeForward, handleNudgeBackward, handleToggleFullscreen, handleToggleVoice, handleToggleRecord]);

  return (
    <div className="w-screen h-[100dvh] flex flex-col bg-[#F9F7F2] text-[#121212] overflow-hidden select-none font-sans">
      
      {/* Top Navigation Bar */}
      <HeaderNav
        mode={mode}
        onSetMode={(m) => {
          setMode(m);
          if (m === 'studio') setMobileScreen('editor');
          else setMobileScreen('prompter');
          if (m === 'camera') {
            setSettings((prev) => ({
              ...prev,
              cameraOverlay: true,
              cameraLayout: prev.cameraLayout || 'pip',
            }));
          }
        }}
        playbackStatus={playbackStatus}
        onTogglePlay={handleTogglePlay}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        isMirrorX={settings.mirrorX}
        onToggleMirrorX={() => setSettings((s) => ({ ...s, mirrorX: !s.mirrorX }))}
        isCameraActive={settings.cameraOverlay || mode === 'camera'}
        onToggleCamera={() => setSettings((s) => ({ ...s, cameraOverlay: !s.cameraOverlay }))}
        isVoiceActive={settings.speechTracking}
        onToggleVoice={handleToggleVoice}
        onOpenAIModal={() => setIsAIOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenDonation={() => setIsDonationOpen(true)}
        onToggleAudioRehearsal={handleToggleAudioRehearsal}
        isAudioRehearsing={isAudioRehearsing}
        activeScriptTitle={activeScript?.title || 'Sin Título'}
        wpm={settings.wpm}
        onUpdateWpm={(newWpm) => handleUpdateSettings({ wpm: newWpm })}
        onUpdateSettings={handleUpdateSettings}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onToggleRecord={handleToggleRecord}
        onOpenRecordingModal={() => setIsRecordingModalOpen(true)}
        takesCount={takesHistory.length}
      />

      {/* Main Workspace Area with Responsive Split & Mobile Switching */}
      <main className={`flex-1 flex overflow-hidden relative md:pb-0 ${
        mobileScreen === 'prompter' || mode !== 'studio' ? 'pb-[10.5rem]' : 'pb-[4.5rem]'
      }`}>
        
        {/* Left Studio Editor Pane: Visible on Desktop when mode='studio', or on Mobile when mobileScreen='editor' */}
        {((mode === 'studio' && mobileScreen === 'editor') || (mode === 'studio')) && (
          <aside className={`h-full shrink-0 border-r border-[#E0DDD5] z-10 flex flex-col ${
            mode === 'studio' ? 'w-full md:w-[420px] lg:w-[480px]' : 'w-full'
          } ${mobileScreen === 'prompter' ? 'hidden md:flex' : 'flex'}`}>
            <StudioEditor
              scripts={scripts}
              activeScriptId={activeScriptId}
              onSelectScript={setActiveScriptId}
              onUpdateScript={handleUpdateScript}
              onCreateScript={handleCreateScript}
              onDeleteScript={handleDeleteScript}
              onCloneScript={handleCloneScript}
              onOpenAIModal={() => setIsAIOpen(true)}
              onLaunchPrompter={() => {
                setMobileScreen('prompter');
                setMode('fullscreen');
              }}
              onOpenDonation={() => setIsDonationOpen(true)}
            />
          </aside>
        )}

        {/* Right Prompter Surface */}
        <section className={`flex-1 h-full relative overflow-hidden bg-black flex flex-col ${
          mobileScreen === 'editor' && mode === 'studio' ? 'hidden md:flex' : 'flex'
        }`}>
          <PrompterCanvas
            content={activeScript?.content || ''}
            settings={settings}
            playbackStatus={playbackStatus}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onReachedEnd={handleRestart}
            onUpdateSettings={handleUpdateSettings}
            onSetMode={setMode}
            onSwitchToEditor={() => {
              setMobileScreen('editor');
              setMode('studio');
            }}
            isMirrorMode={mode === 'mirror'}
            cameraActive={mode === 'camera' || settings.cameraOverlay}
            speechTracking={settings.speechTracking}
            voiceProgress={voiceProgressRatio}
            voiceWordIndex={voiceWordIndex}
            voiceMatchedWord={lastVoiceWord}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            onToggleRecord={handleToggleRecord}
            onOpenRecordingModal={() => setIsRecordingModalOpen(true)}
            takesCount={takesHistory.length}
          />

          {/* Countdown 3-2-1 Overlay */}
          {countdownNumber !== null && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-3 animate-in zoom-in-50 duration-200">
                <span className="text-8xl sm:text-9xl font-mono font-black text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.8)]">
                  {countdownNumber}
                </span>
                <span className="text-xs sm:text-sm font-mono tracking-widest text-[#F9F7F2] uppercase">
                  ¡PREPÁRATE! Texto + grabación
                </span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Desktop control bar (in document flow) */}
      {(mobileScreen === 'prompter' || mode !== 'studio') && (
        <div className="hidden md:block">
          <ControlOverlay
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            playbackStatus={playbackStatus}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onNudgeForward={handleNudgeForward}
            onNudgeBackward={handleNudgeBackward}
            elapsedSeconds={elapsedSeconds}
            totalEstimatedSeconds={totalEstimatedSeconds}
            wordCount={wordCount}
            isVoiceActive={settings.speechTracking}
            onToggleVoice={handleToggleVoice}
            isCameraActive={settings.cameraOverlay || mode === 'camera'}
            onToggleCamera={() => {
              const turningOn = !settings.cameraOverlay;
              if (turningOn && isMobileDevice()) {
                const avPromise = beginAvCaptureFromUserGesture();
                void adoptAvPromise(avPromise).then((ok) => {
                  if (!ok) return;
                  setSettings((s) => ({
                    ...s,
                    cameraOverlay: true,
                    cameraLayout: s.cameraLayout || 'pip',
                  }));
                });
                return;
              }
              setSettings((s) => ({
                ...s,
                cameraOverlay: !s.cameraOverlay,
                cameraLayout: s.cameraLayout || 'pip',
              }));
            }}
            isMirrorActive={mode === 'mirror' || settings.mirrorX}
            onToggleMirror={() => {
              if (mode === 'mirror') {
                setMode('fullscreen');
                setSettings((s) => ({ ...s, mirrorX: false }));
              } else {
                setMode('mirror');
                setMobileScreen('prompter');
                setSettings((s) => ({ ...s, mirrorX: true }));
              }
            }}
            isMobileScreen={false}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            onToggleRecord={handleToggleRecord}
            onOpenRecordingModal={() => setIsRecordingModalOpen(true)}
            takesCount={takesHistory.length}
          />
        </div>
      )}

      {/* Mobile chrome: play bar stacked ABOVE the 3-tab nav (never overlaps) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col safe-bottom bg-[#F9F7F2]">
        {(mobileScreen === 'prompter' || mode !== 'studio') && (
          <ControlOverlay
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            playbackStatus={playbackStatus}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onNudgeForward={handleNudgeForward}
            onNudgeBackward={handleNudgeBackward}
            elapsedSeconds={elapsedSeconds}
            totalEstimatedSeconds={totalEstimatedSeconds}
            wordCount={wordCount}
            isVoiceActive={settings.speechTracking}
            onToggleVoice={handleToggleVoice}
            isCameraActive={settings.cameraOverlay || mode === 'camera'}
            onToggleCamera={() => {
              const turningOn = !settings.cameraOverlay;
              if (turningOn && isMobileDevice()) {
                const avPromise = beginAvCaptureFromUserGesture();
                void adoptAvPromise(avPromise).then((ok) => {
                  if (!ok) return;
                  setSettings((s) => ({
                    ...s,
                    cameraOverlay: true,
                    cameraLayout: 'pip',
                  }));
                });
                return;
              }
              setSettings((s) => ({
                ...s,
                cameraOverlay: !s.cameraOverlay,
                cameraLayout: 'pip',
              }));
            }}
            isMirrorActive={mode === 'mirror' || settings.mirrorX}
            onToggleMirror={() => {
              if (mode === 'mirror') {
                setMode('fullscreen');
                setSettings((s) => ({ ...s, mirrorX: false }));
              } else {
                setMode('mirror');
                setMobileScreen('prompter');
                setSettings((s) => ({ ...s, mirrorX: true }));
              }
            }}
            isMobileScreen={true}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            onToggleRecord={handleToggleRecord}
            onOpenRecordingModal={() => setIsRecordingModalOpen(true)}
            takesCount={takesHistory.length}
          />
        )}
        <MobileBottomNav
          currentScreen={mobileScreen}
          mode={mode}
          onSetScreen={(s) => setMobileScreen(s)}
          onSetMode={(m) => setMode(m)}
          onOpenMore={() => setIsMobileMoreOpen(true)}
          isMoreOpen={isMobileMoreOpen}
        />
      </div>

      <MobileMoreSheet
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        isCameraActive={settings.cameraOverlay || mode === 'camera'}
        onToggleCamera={() => {
          const turningOn = !settings.cameraOverlay;
          if (turningOn) {
            const avPromise = beginAvCaptureFromUserGesture();
            void adoptAvPromise(avPromise).then((ok) => {
              if (!ok) return;
              setSettings((s) => ({
                ...s,
                cameraOverlay: true,
                cameraLayout: 'pip',
              }));
              setMobileScreen('prompter');
              setMode('camera');
            });
            return;
          }
          setSettings((s) => ({ ...s, cameraOverlay: false }));
          setMode('fullscreen');
        }}
        isMirrorActive={mode === 'mirror' || settings.mirrorX}
        onToggleMirror={() => {
          if (mode === 'mirror') {
            setMode('fullscreen');
            setSettings((s) => ({ ...s, mirrorX: false }));
          } else {
            setMode('mirror');
            setMobileScreen('prompter');
            setSettings((s) => ({ ...s, mirrorX: true }));
          }
        }}
        isVoiceActive={settings.speechTracking}
        onToggleVoice={handleToggleVoice}
        isRecording={isRecording}
        playbackStatus={playbackStatus}
        onTogglePlay={handleTogglePlay}
        takesCount={takesHistory.length}
        onOpenRecordingModal={() => setIsRecordingModalOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenDonation={() => setIsDonationOpen(true)}
        cameraLayoutLabel={
          settings.cameraLayout === 'side-by-side'
            ? 'Dividido'
            : settings.cameraLayout === 'background'
            ? 'Fondo'
            : 'Flotante'
        }
        onCycleCameraLayout={() => {
          const order: Array<'pip' | 'side-by-side' | 'background'> = [
            'pip',
            'side-by-side',
            'background',
          ];
          const idx = order.indexOf((settings.cameraLayout as 'pip' | 'side-by-side' | 'background') || 'pip');
          const next = order[(idx + 1) % order.length];
          setSettings((s) => ({ ...s, cameraLayout: next, cameraOverlay: true }));
        }}
      />

      {/* REC indicator — muy visible en móvil */}
      {isRecording && (
        <div className="fixed top-[3.75rem] left-1/2 -translate-x-1/2 z-[60] pointer-events-none px-2">
          <div className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-mono font-black shadow-editorial flex items-center gap-2 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <span>
              REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
              {String(recordingSeconds % 60).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold opacity-90 hidden sm:inline">
              · Toca pausa para terminar
            </span>
          </div>
        </div>
      )}

      {recorderError && (
        <div className="fixed top-[6.5rem] left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] px-2">
          <button
            type="button"
            onClick={clearRecorderError}
            className="px-3 py-2 rounded-xs bg-neutral-900/90 text-white text-[11px] font-mono shadow-editorial text-center border border-white/20"
          >
            {recorderError}
          </button>
        </div>
      )}

      {/* Voice status / help banners */}
      {(voiceBanner || (settings.speechTracking && !isRecording)) && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] px-2 ${
            isRecording ? 'top-[6.5rem]' : 'top-[3.75rem]'
          }`}
        >
          {voiceBanner ? (
            <button
              type="button"
              onClick={() => setVoiceBanner(null)}
              className="px-3 py-2 rounded-xs bg-neutral-900/90 text-white text-[11px] font-mono shadow-editorial text-center border border-white/20"
            >
              {voiceBanner}
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-emerald-500 text-black text-[10px] font-mono font-bold shadow-editorial flex items-center gap-2 justify-center pointer-events-none">
              <span
                className={`w-2 h-2 rounded-full bg-black ${isListening ? 'animate-pulse' : 'opacity-40'}`}
              />
              <span className="truncate max-w-[75vw]">
                {voiceError
                  ? voiceError
                  : isListening
                    ? lastTranscript
                      ? `«${lastTranscript}»`
                      : 'Voz ON — habla ahora…'
                    : 'Voz ON — iniciando mic…'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <RecordingModal
        isOpen={isRecordingModalOpen}
        take={latestTake}
        takesHistory={takesHistory}
        onClose={() => setIsRecordingModalOpen(false)}
        onRetake={() => {
          setIsRecordingModalOpen(false);
          handleToggleRecord();
        }}
        onDeleteTake={deleteTakeFromHistory}
        onClearAllTakes={clearAllTakes}
      />
      <ScriptsLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        scripts={scripts}
        activeScriptId={activeScriptId}
        onSelectScript={(id) => {
          setActiveScriptId(id);
          setMobileScreen('editor');
        }}
        onCreateScript={handleCreateScript}
        onDeleteScript={handleDeleteScript}
        onCloneScript={handleCloneScript}
        onImportScript={(newScript) => {
          setScripts((prev) => [newScript, ...prev]);
          setActiveScriptId(newScript.id);
        }}
        onOpenAIModal={() => {
          setIsLibraryOpen(false);
          setIsAIOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenDonation={() => setIsDonationOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        currentScriptContent={activeScript?.content || ''}
        onApplyScript={(newContent) => {
          if (activeScript) {
            handleUpdateScript({
              ...activeScript,
              content: newContent,
              updatedAt: new Date().toISOString(),
            });
          }
        }}
        onCreateNewScriptWithContent={(title, content) => {
          const newScript: Script = {
            id: `script-${Date.now()}`,
            title,
            category: 'IA Generado',
            targetWPM: 135,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setScripts((prev) => [newScript, ...prev]);
          setActiveScriptId(newScript.id);
          setMobileScreen('editor');
        }}
        onOpenDonation={() => setIsDonationOpen(true)}
      />
    </div>
  );
}

