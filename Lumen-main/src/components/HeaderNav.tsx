import React from 'react';
import { 
  Play, 
  Pause, 
  Tv, 
  Maximize2, 
  Minimize2, 
  FlipHorizontal, 
  Camera, 
  Mic, 
  Sparkles, 
  Settings, 
  Keyboard, 
  Volume2, 
  Layers,
  Gauge,
  Minus,
  Plus,
  Film,
  Heart,
  BookOpen
} from 'lucide-react';
import { PrompterMode, PlaybackStatus } from '../types';

interface HeaderNavProps {
  mode: PrompterMode;
  onSetMode: (mode: PrompterMode) => void;
  playbackStatus: PlaybackStatus;
  onTogglePlay: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isMirrorX: boolean;
  onToggleMirrorX: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  onOpenAIModal: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenManual?: () => void;
  onOpenLibrary?: () => void;
  onOpenDonation?: () => void;
  onToggleAudioRehearsal: () => void;
  isAudioRehearsing: boolean;
  activeScriptTitle: string;
  wpm?: number;
  onUpdateWpm?: (wpm: number) => void;
  onUpdateSettings?: (partial: { cameraOverlay?: boolean; cameraLayout?: 'side-by-side' | 'pip' | 'background' }) => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecord?: () => void;
  onOpenRecordingModal?: () => void;
  takesCount?: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  mode,
  onSetMode,
  playbackStatus,
  onTogglePlay,
  isFullscreen,
  onToggleFullscreen,
  isMirrorX,
  onToggleMirrorX,
  isCameraActive,
  onToggleCamera,
  isVoiceActive,
  onToggleVoice,
  onOpenAIModal,
  onOpenSettings,
  onOpenShortcuts,
  onOpenManual,
  onOpenLibrary,
  onOpenDonation,
  onToggleAudioRehearsal,
  isAudioRehearsing,
  activeScriptTitle,
  wpm = 135,
  onUpdateWpm,
  onUpdateSettings,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecord,
  onOpenRecordingModal,
  takesCount = 0,
}) => {
  const formatRecTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <header className="h-14 sm:h-16 bg-[#F9F7F2] border-b border-[#E0DDD5] px-3 sm:px-8 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand Logo & Current Script (Editorial Masthead Style) */}
      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-serif italic font-bold tracking-tighter text-[#121212]">
              Lumen.
            </span>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-semibold text-[#888] pl-1 border-l border-[#D6D2C4] hidden xs:inline">
              Studio
            </span>
          </div>
          <span className="text-[8px] font-mono tracking-tight text-[#888] hidden sm:block -mt-1">
            © EBYZOM E.I.R.L.
          </span>
        </div>

        {/* Clickable Script Pill — desktop; mobile uses Menú → Guiones */}
        {onOpenLibrary && (
          <button
            onClick={onOpenLibrary}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFECE6] hover:bg-[#E5E2D9] border border-[#E0DDD5] text-[#121212] transition-colors max-w-[260px] truncate"
            title="Abrir Biblioteca de Guiones"
          >
            <span className="text-[9px] uppercase tracking-wider text-[#888] font-mono hidden md:inline">GUIÓN:</span>
            <span className="text-xs font-serif italic font-semibold truncate">
              "{activeScriptTitle}"
            </span>
          </button>
        )}
        <span className="sm:hidden text-xs font-serif italic text-[#666] truncate max-w-[42vw]">
          {activeScriptTitle}
        </span>
      </div>

      {/* Mode Switcher Tabs (Editorial Navigation) */}
      <nav className="hidden lg:flex items-center gap-1 sm:gap-2 bg-[#EFECE6] p-1 rounded-sm border border-[#E0DDD5]">
        <button
          onClick={() => onSetMode('studio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'studio'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Estudio: Editor y Texto"
        >
          <Layers className="w-3.5 h-3.5 text-[#121212]" />
          <span>Estudio</span>
        </button>

        <button
          onClick={() => onSetMode('fullscreen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'fullscreen'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Lectura: Concentración total"
        >
          <Tv className="w-3.5 h-3.5 text-[#121212]" />
          <span>Lectura Pro</span>
        </button>

        <button
          onClick={() => onSetMode('mirror')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'mirror'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Espejo: Para hardware de teleprompter"
        >
          <FlipHorizontal className="w-3.5 h-3.5 text-[#121212]" />
          <span>Espejo</span>
        </button>

        <button
          onClick={() => {
            onSetMode('camera');
            onUpdateSettings?.({ cameraOverlay: true, cameraLayout: 'pip' });
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'camera'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Cámara: ventana flotante por defecto (cambia a Dividido o Fondo abajo)"
        >
          <Camera className="w-3.5 h-3.5 text-[#121212]" />
          <span>Cámara</span>
        </button>
      </nav>

      {/* Quick Tool Actions — mobile: solo ⚙ | desktop: herramientas completas */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={onOpenSettings}
          className="md:hidden w-10 h-10 rounded-full bg-white border border-[#E0DDD5] text-[#555] flex items-center justify-center shrink-0"
          title="Configuración"
        >
          <Settings className="w-4 h-4" />
        </button>

        {onUpdateWpm && (
          <div className="hidden md:flex items-center gap-1 bg-[#EFECE6] border border-[#E0DDD5] px-2 py-1 rounded-full text-xs font-mono shadow-2xs">
            <span className="text-[10px] font-bold text-[#121212] flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              <span>{wpm} WPM</span>
            </span>
            <div className="flex items-center gap-0.5 ml-1 border-l border-[#D6D2C4] pl-1">
              <button onClick={() => onUpdateWpm(Math.max(10, wpm - 5))} className="w-5 h-5 rounded-full bg-white hover:bg-[#121212] hover:text-white flex items-center justify-center">
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => onUpdateWpm(Math.min(320, wpm + 5))} className="w-5 h-5 rounded-full bg-white hover:bg-[#121212] hover:text-white flex items-center justify-center">
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}

        {takesCount > 0 && onOpenRecordingModal && (
          <button
            onClick={onOpenRecordingModal}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-[#D6D2C4] text-xs font-mono font-bold"
            title="Tomas guardadas"
          >
            <Film className="w-3.5 h-3.5" />
            <span>{takesCount}</span>
          </button>
        )}

        <button
          onClick={onTogglePlay}
          className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-mono font-bold border ${
            isRecording
              ? 'bg-red-600 text-white border-red-400 animate-pulse'
              : playbackStatus === 'playing'
                ? 'bg-[#121212] text-white border-[#121212]'
                : 'bg-white text-[#666] border-[#E0DDD5]'
          }`}
          title={
            playbackStatus === 'playing' || isRecording
              ? 'Pausar texto y detener grabación'
              : 'Iniciar texto + grabar cámara'
          }
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>REC {formatRecTime(recordingSeconds)}</span>
            </>
          ) : playbackStatus === 'playing' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>EN VIVO</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#999]" />
              <span>INICIAR</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleVoice}
          className={`hidden md:flex w-9 h-9 rounded-full border items-center justify-center relative ${
            isVoiceActive ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white text-[#555] border-[#E0DDD5]'
          }`}
        >
          <Mic className="w-4 h-4" />
          {isVoiceActive && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-black rounded-full animate-pulse" />}
        </button>

        {onOpenDonation && (
          <button onClick={onOpenDonation} className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-linear-to-r from-red-600 to-rose-700 text-white text-xs font-mono font-bold border border-red-500/50">
            <Heart className="w-3.5 h-3.5 fill-current" /><span>Donar</span>
          </button>
        )}

        <button onClick={onOpenAIModal} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121212] text-white text-[10px] uppercase tracking-widest font-bold">
          <Sparkles className="w-3.5 h-3.5" /><span>IA</span>
        </button>

        <button
          onClick={onToggleAudioRehearsal}
          className={`hidden md:flex w-9 h-9 rounded-full border items-center justify-center ${
            isAudioRehearsing ? 'bg-[#121212] text-white border-[#121212]' : 'bg-white text-[#555] border-[#E0DDD5]'
          }`}
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {onOpenManual && (
          <button onClick={onOpenManual} className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] hidden lg:flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        <button onClick={onOpenShortcuts} className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] hidden lg:flex items-center justify-center">
          <Keyboard className="w-4 h-4" />
        </button>

        <button onClick={onOpenSettings} className="hidden md:flex w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] items-center justify-center">
          <Settings className="w-4 h-4" />
        </button>

        <button onClick={onToggleFullscreen} className="hidden md:flex w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] items-center justify-center">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
