import React from 'react';
import { useStore } from './store/useStore';
import { HeaderNav } from './components/HeaderNav';
import { StudioEditor } from './components/StudioEditor';
import { PrompterCanvas } from './components/PrompterCanvas';
import { ControlOverlay } from './components/ControlOverlay';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileMoreSheet } from './components/MobileMoreSheet';
import { ModalsContainer } from './components/ModalsContainer';
import { usePrompterLogic } from './hooks/usePrompterLogic';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { beginAvCaptureFromUserGesture, isMobileDevice } from './utils/recordingCapture';

export default function App() {
  const store = useStore();

  // Destructure store actions and state
  const {
    scripts = [],
    activeScriptId = '',
    settings,
    mode = 'studio',
    mobileScreen = 'editor',
    playbackStatus = 'idle',
    isFullscreen = false,
    elapsedSeconds = 0,
    countdownNumber = null,
    isAudioRehearsing = false,
    voiceBanner = null,
    isMobileMoreOpen = false,
    setActiveScriptId,
    updateSettings,
    setMode,
    setMobileScreen,
    setMobileMoreOpen,
    setAIOpen,
    setSettingsOpen,
    setShortcutsOpen,
    setManualOpen,
    setLibraryOpen,
    setDonationOpen,
    setRecordingModalOpen,
  } = store;

  // Get prompter logic and recorder
  const logic = usePrompterLogic();
  const {
    activeScript,
    wordCount = 0,
    totalEstimatedSeconds = 0,
    recorder,
    speechFollower,
    voiceProgressRatio = 0,
    voiceWordIndex = 0,
    lastVoiceWord = '',
    handleToggleVoice,
    handleTogglePlay,
    handleRestart,
    handleNudgeForward,
    handleNudgeBackward,
    handleToggleAudioRehearsal,
    handleToggleFullscreen,
    handleToggleRecord,
  } = logic;

  const {
    isRecording = false,
    recordingSeconds = 0,
    latestTake = null,
    takesHistory = [],
    adoptAvPromise,
    deleteTakeFromHistory,
    clearAllTakes,
  } = recorder;

  const { isListening = false, error: voiceError = null, lastTranscript = '' } = speechFollower;

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    handleTogglePlay,
    handleRestart,
    handleNudgeForward,
    handleNudgeBackward,
    handleToggleFullscreen,
    handleToggleVoice,
    handleToggleRecord,
  });

  // Safe checks for active script
  const content = activeScript?.content || '';
  const scriptTitle = activeScript?.title || 'Sin Título';

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
            updateSettings({
              cameraOverlay: true,
              cameraLayout: settings.cameraLayout || 'pip',
            });
          }
        }}
        playbackStatus={playbackStatus}
        onTogglePlay={handleTogglePlay}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        isMirrorX={settings.mirrorX}
        onToggleMirrorX={() => updateSettings({ mirrorX: !settings.mirrorX })}
        isCameraActive={settings.cameraOverlay || mode === 'camera'}
        onToggleCamera={() => updateSettings({ cameraOverlay: !settings.cameraOverlay })}
        isVoiceActive={settings.speechTracking}
        onToggleVoice={handleToggleVoice}
        onOpenAIModal={() => setAIOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenManual={() => setManualOpen(true)}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenDonation={() => setDonationOpen(true)}
        onToggleAudioRehearsal={handleToggleAudioRehearsal}
        isAudioRehearsing={isAudioRehearsing}
        activeScriptTitle={scriptTitle}
        wpm={settings.wpm}
        onUpdateWpm={(newWpm) => updateSettings({ wpm: newWpm })}
        onUpdateSettings={updateSettings}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onToggleRecord={handleToggleRecord}
        onOpenRecordingModal={() => setRecordingModalOpen(true)}
        takesCount={takesHistory.length}
      />

      {/* Main Workspace Area */}
      <main className={`flex-1 flex overflow-hidden relative md:pb-0 ${
        (mobileScreen === 'prompter' || mode !== 'studio') ? 'pb-[10.5rem]' : 'pb-[4.5rem]'
      }`}>
        
        {/* Left Studio Editor Pane (Studio Mode only) */}
        {mode === 'studio' && (
          <aside className={`h-full shrink-0 border-r border-[#E0DDD5] z-10 flex flex-col w-full md:w-[420px] lg:w-[480px] ${
            mobileScreen === 'prompter' ? 'hidden md:flex' : 'flex'
          }`}>
            <StudioEditor
              scripts={scripts}
              activeScriptId={activeScriptId}
              onSelectScript={setActiveScriptId}
              onUpdateScript={store.updateScript}
              onCreateScript={store.createScript}
              onDeleteScript={store.deleteScript}
              onCloneScript={store.cloneScript}
              onOpenAIModal={() => setAIOpen(true)}
              onLaunchPrompter={() => {
                setMobileScreen('prompter');
                setMode('fullscreen');
              }}
              onOpenDonation={() => setDonationOpen(true)}
            />
          </aside>
        )}

        {/* Right Prompter Surface */}
        <section className={`flex-1 h-full relative overflow-hidden bg-black flex flex-col ${
          (mobileScreen === 'editor' && mode === 'studio') ? 'hidden md:flex' : 'flex'
        }`}>
          <PrompterCanvas
            content={content}
            settings={settings}
            playbackStatus={playbackStatus}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onReachedEnd={handleRestart}
            onUpdateSettings={updateSettings}
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
            onOpenRecordingModal={() => setRecordingModalOpen(true)}
            takesCount={takesHistory.length}
          />

          {/* Countdown Overlay */}
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

      {/* Desktop control bar */}
      {(mobileScreen === 'prompter' || mode !== 'studio') && (
        <div className="hidden md:block">
          <ControlOverlay
            settings={settings}
            onUpdateSettings={updateSettings}
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
                  updateSettings({ cameraOverlay: true, cameraLayout: settings.cameraLayout || 'pip' });
                });
                return;
              }
              updateSettings({ cameraOverlay: !settings.cameraOverlay, cameraLayout: settings.cameraLayout || 'pip' });
            }}
            isMirrorActive={mode === 'mirror' || settings.mirrorX}
            onToggleMirror={() => {
              if (mode === 'mirror') {
                setMode('fullscreen');
                updateSettings({ mirrorX: false });
              } else {
                setMode('mirror');
                setMobileScreen('prompter');
                updateSettings({ mirrorX: true });
              }
            }}
            isMobileScreen={false}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            onToggleRecord={handleToggleRecord}
            onOpenRecordingModal={() => setRecordingModalOpen(true)}
            takesCount={takesHistory.length}
          />
        </div>
      )}

      {/* Mobile controls */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col safe-bottom bg-[#F9F7F2]">
        {(mobileScreen === 'prompter' || mode !== 'studio') && (
          <ControlOverlay
            settings={settings}
            onUpdateSettings={updateSettings}
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
                  updateSettings({ cameraOverlay: true, cameraLayout: 'pip' });
                });
                return;
              }
              updateSettings({ cameraOverlay: !settings.cameraOverlay, cameraLayout: 'pip' });
            }}
            isMirrorActive={mode === 'mirror' || settings.mirrorX}
            onToggleMirror={() => {
              if (mode === 'mirror') {
                setMode('fullscreen');
                updateSettings({ mirrorX: false });
              } else {
                setMode('mirror');
                setMobileScreen('prompter');
                updateSettings({ mirrorX: true });
              }
            }}
            isMobileScreen={true}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            onToggleRecord={handleToggleRecord}
            onOpenRecordingModal={() => setRecordingModalOpen(true)}
            takesCount={takesHistory.length}
          />
        )}
        <MobileBottomNav
          currentScreen={mobileScreen}
          mode={mode}
          onSetScreen={(s) => {
            if (s === 'prompter') {
              const av = beginAvCaptureFromUserGesture();
              void adoptAvPromise(av);
              updateSettings({ cameraOverlay: true, cameraLayout: settings.cameraLayout || 'pip' });
            }
            setMobileScreen(s);
          }}
          onSetMode={(m) => setMode(m)}
          onOpenMore={() => setMobileMoreOpen(true)}
          isMoreOpen={isMobileMoreOpen}
        />
      </div>

      <MobileMoreSheet
        isOpen={isMobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        isCameraActive={settings.cameraOverlay || mode === 'camera'}
        onToggleCamera={() => {
          const turningOn = !settings.cameraOverlay;
          if (turningOn) {
            const avPromise = beginAvCaptureFromUserGesture();
            void adoptAvPromise(avPromise).then((ok) => {
              if (!ok) return;
              updateSettings({ cameraOverlay: true, cameraLayout: 'pip' });
              setMobileScreen('prompter');
              setMode('camera');
            });
            return;
          }
          updateSettings({ cameraOverlay: false });
          setMode('fullscreen');
        }}
        isMirrorActive={mode === 'mirror' || settings.mirrorX}
        onToggleMirror={() => {
          if (mode === 'mirror') {
            setMode('fullscreen');
            updateSettings({ mirrorX: false });
          } else {
            setMode('mirror');
            setMobileScreen('prompter');
            updateSettings({ mirrorX: true });
          }
        }}
        isVoiceActive={settings.speechTracking}
        onToggleVoice={handleToggleVoice}
        isRecording={isRecording}
        playbackStatus={playbackStatus}
        onTogglePlay={handleTogglePlay}
        takesCount={takesHistory.length}
        onOpenRecordingModal={() => setRecordingModalOpen(true)}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAI={() => setAIOpen(true)}
        onOpenDonation={() => setDonationOpen(true)}
        cameraLayoutLabel={
          settings.cameraLayout === 'side-by-side' ? 'Dividido' : settings.cameraLayout === 'background' ? 'Fondo' : 'Flotante'
        }
        onCycleCameraLayout={() => {
          const order: Array<'pip' | 'side-by-side' | 'background'> = ['pip', 'side-by-side', 'background'];
          const idx = order.indexOf((settings.cameraLayout as any) || 'pip');
          const next = order[(idx + 1) % order.length];
          updateSettings({ cameraLayout: next, cameraOverlay: true });
        }}
      />

      {/* REC indicator */}
      {isRecording && (
        <div className="fixed top-[3.75rem] left-1/2 -translate-x-1/2 z-[60] pointer-events-none px-2">
          <div className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-mono font-black shadow-editorial flex items-center gap-2 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <span>
              REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
              {String(recordingSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* Voice status / banners */}
      {(voiceBanner || (settings.speechTracking && !isRecording)) && (
        <div className={`fixed left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] px-2 ${isRecording ? 'top-[6.5rem]' : 'top-[3.75rem]'}`}>
          {voiceBanner ? (
            <button
              type="button"
              onClick={() => store.setVoiceBanner(null)}
              className="px-3 py-2 rounded-xs bg-neutral-900/90 text-white text-[11px] font-mono shadow-editorial text-center border border-white/20"
            >
              {voiceBanner}
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-emerald-500 text-black text-[10px] font-mono font-bold shadow-editorial flex items-center gap-2 justify-center pointer-events-none">
              <span className={`w-2 h-2 rounded-full bg-black ${isListening ? 'animate-pulse' : 'opacity-40'}`} />
              <span className="truncate max-w-[75vw]">
                {voiceError ? voiceError : isListening ? (lastTranscript ? `«${lastTranscript}»` : 'Voz ON — habla ahora…') : 'Voz ON — iniciando mic…'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modals Container */}
      <ModalsContainer
        latestTake={latestTake}
        takesHistory={takesHistory}
        onDeleteTake={deleteTakeFromHistory}
        onClearAllTakes={clearAllTakes}
        onToggleRecord={handleToggleRecord}
      />
    </div>
  );
}
