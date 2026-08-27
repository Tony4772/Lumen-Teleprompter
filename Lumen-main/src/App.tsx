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
  countdownSeconds: 3,
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
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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

  // Speech Recognition Follower integration
  const [voiceProgressRatio, setVoiceProgressRatio] = useState<number>(0);
  const [voiceWordIndex, setVoiceWordIndex] = useState<number>(0);
  const [lastVoiceWord, setLastVoiceWord] = useState<string>('');

  const handleVoiceProgress = useCallback((ratio: number, matchedWord: string, wordIndex: number) => {
    setVoiceProgressRatio(ratio);
    setLastVoiceWord(matchedWord);
    setVoiceWordIndex(wordIndex);
  }, []);

  const { isListening, lastTranscript, error: voiceError, resetVoiceTracking } = useSpeechFollower({
    enabled: settings.speechTracking,
    scriptContent: activeScript?.content || '',
    onMatchProgress: handleVoiceProgress,
  });

  // When enabling voice tracking, pause WPM auto-scroll so the mic drives movement
  useEffect(() => {
    if (settings.speechTracking && playbackStatus === 'playing') {
      setPlaybackStatus('paused');
    }
    if (!settings.speechTracking) {
      resetVoiceTracking();
      setVoiceProgressRatio(0);
      setVoiceWordIndex(0);
      setLastVoiceWord('');
    }
  }, [settings.speechTracking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video Recorder Hook
  const {
    isRecording,
    recordingSeconds,
    latestTake,
    takesHistory,
    recorderError,
    startRecording,
    stopRecording,
    deleteTakeFromHistory,
  } = useVideoRecorder({
    scriptTitle: activeScript?.title,
    scriptId: activeScript?.id,
    onRecordingFinished: () => {
      setIsRecordingModalOpen(true);
    },
  });

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

  // Handle Play/Pause with optional countdown
  const handleTogglePlay = useCallback(() => {
    if (playbackStatus === 'playing') {
      setPlaybackStatus('paused');
      AudioRehearsalEngine.stop();
      setIsAudioRehearsing(false);
    } else {
      if (settings.countdownSeconds > 0 && playbackStatus === 'idle') {
        setPlaybackStatus('countdown');
        let currentCount = settings.countdownSeconds;
        setCountdownNumber(currentCount);

        const countInterval = setInterval(() => {
          currentCount -= 1;
          if (currentCount > 0) {
            setCountdownNumber(currentCount);
          } else {
            clearInterval(countInterval);
            setCountdownNumber(null);
            setPlaybackStatus('playing');
          }
        }, 1000);
      } else {
        setPlaybackStatus('playing');
      }
    }
  }, [playbackStatus, settings.countdownSeconds]);

  // Restart to top
  const handleRestart = useCallback(() => {
    setPlaybackStatus('idle');
    setElapsedSeconds(0);
    setCountdownNumber(null);
    resetVoiceTracking();
    AudioRehearsalEngine.stop();
    setIsAudioRehearsing(false);

    // Scroll to top
    const canvasScroller = document.querySelector('.no-scrollbar');
    if (canvasScroller) {
      canvasScroller.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [resetVoiceTracking]);

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

  // Record / Stop Video Handler
  const handleToggleRecord = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      setIsRecordingModalOpen(true);
    } else {
      // Automatically make camera visible
      if (!settings.cameraOverlay && mode !== 'camera') {
        setSettings((prev) => ({ ...prev, cameraOverlay: true }));
      }
      const started = await startRecording();
      if (started && playbackStatus !== 'playing') {
        // Start prompter scrolling for speaker
        handleTogglePlay();
      }
    }
  }, [isRecording, stopRecording, settings.cameraOverlay, mode, startRecording, playbackStatus, handleTogglePlay]);

  // Update Settings Partial
  const handleUpdateSettings = useCallback((newSettings: Partial<PrompterSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

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
        setSettings((prev) => ({ ...prev, speechTracking: !prev.speechTracking }));
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
  }, [handleTogglePlay, handleRestart, handleNudgeForward, handleNudgeBackward, handleToggleFullscreen]);

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
        onToggleVoice={() => setSettings((s) => ({ ...s, speechTracking: !s.speechTracking }))}
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
      <main className="flex-1 flex overflow-hidden relative pb-14 md:pb-0">
        
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
              onInsertCue={(tag) => {}}
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
                  ¡PREPÁRATE PARA HABLAR!
                </span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Bottom Control Bar (Hidden on Mobile when on Editor view to save vertical space) */}
      {(mobileScreen === 'prompter' || mode !== 'studio') && (
        <div className="fixed md:static bottom-14 md:bottom-auto left-0 right-0 z-30">
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
            onToggleVoice={() => setSettings((s) => ({ ...s, speechTracking: !s.speechTracking }))}
            isCameraActive={settings.cameraOverlay || mode === 'camera'}
            onToggleCamera={() => setSettings((s) => ({
              ...s,
              cameraOverlay: !s.cameraOverlay,
              cameraLayout: s.cameraLayout || 'pip',
            }))}
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
        </div>
      )}

      {/* Mobile Bottom Navigation: Editor | Lectura | Menú */}
      <MobileBottomNav
        currentScreen={mobileScreen}
        mode={mode}
        onSetScreen={(s) => setMobileScreen(s)}
        onSetMode={(m) => setMode(m)}
        onOpenMore={() => setIsMobileMoreOpen(true)}
        isMoreOpen={isMobileMoreOpen}
      />

      <MobileMoreSheet
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        isCameraActive={settings.cameraOverlay || mode === 'camera'}
        onToggleCamera={() => {
          setSettings((s) => {
            const turningOn = !s.cameraOverlay;
            return {
              ...s,
              cameraOverlay: turningOn,
              cameraLayout: turningOn ? 'pip' : s.cameraLayout,
            };
          });
          if (!settings.cameraOverlay) {
            setMobileScreen('prompter');
            setMode('camera');
          } else {
            setMode('fullscreen');
          }
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
        onToggleVoice={() => setSettings((s) => ({ ...s, speechTracking: !s.speechTracking }))}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onToggleRecord={handleToggleRecord}
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

      {/* Voice tracking feedback — compact on mobile */}
      {settings.speechTracking && (
        <div className="fixed top-[3.75rem] left-1/2 -translate-x-1/2 z-50 max-w-[92vw] pointer-events-none px-2">
          {voiceError ? (
            <div className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-mono font-bold shadow-editorial text-center">
              {voiceError}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/95 text-black text-[10px] font-mono font-bold shadow-editorial flex items-center gap-2 justify-center">
              <span className={`w-1.5 h-1.5 rounded-full bg-black ${isListening ? 'animate-pulse' : 'opacity-40'}`} />
              <span className="truncate max-w-[70vw]">
                {isListening
                  ? lastTranscript
                    ? `«${lastTranscript}»`
                    : 'Escuchando…'
                  : 'Mic…'}
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

