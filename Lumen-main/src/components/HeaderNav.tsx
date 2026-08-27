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
  Square,
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

        {/* Clickable Script Pill */}
        {onOpenLibrary && (
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFECE6] hover:bg-[#E5E2D9] border border-[#E0DDD5] text-[#121212] transition-colors max-w-[140px] xs:max-w-[200px] sm:max-w-[260px] truncate"
            title="Abrir Biblioteca de Guiones"
          >
            <span className="text-[9px] uppercase tracking-wider text-[#888] font-mono hidden sm:inline">GUIÓN:</span>
            <span className="text-xs font-serif italic font-semibold truncate">
              "{activeScriptTitle}"
            </span>
          </button>
        )}
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
          title="Modo Estudio: Editor y Prompter en vista dividida"
        >
          <Layers className="w-3.5 h-3.5 text-[#121212]" />
          <span>Atelier Split</span>
        </button>

        <button
          onClick={() => onSetMode('fullscreen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'fullscreen'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Prompter: Pantalla limpia sin distracciones"
        >
          <Tv className="w-3.5 h-3.5 text-[#121212]" />
          <span>Prompter Pro</span>
        </button>

        <button
          onClick={() => onSetMode('mirror')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'mirror'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Cristal Espejo: Reflejo horizontal para teleprompter de hardware"
        >
          <FlipHorizontal className="w-3.5 h-3.5 text-[#121212]" />
          <span>Espejo Óptico</span>
        </button>

        <button
          onClick={() => onSetMode('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-bold rounded-xs transition-all ${
            mode === 'camera'
              ? 'bg-white text-[#121212] shadow-xs border border-[#D6D2C4]'
              : 'text-[#666] hover:text-[#121212] hover:bg-white/50'
          }`}
          title="Modo Cámara: Tu webcam en vivo al lado del teleprómpter"
        >
          <Camera className="w-3.5 h-3.5 text-[#121212]" />
          <span>Cámara Split</span>
        </button>
      </nav>

      {/* Quick Tool Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Prominent Header Speed Regulator Widget */}
        {onUpdateWpm && (
          <div className="flex items-center gap-1 bg-[#EFECE6] border border-[#E0DDD5] px-2 py-1 rounded-full text-xs font-mono shadow-2xs">
            <span className="text-[10px] font-bold text-[#121212] flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-[#121212]" />
              <span className="hidden xs:inline">{wpm} WPM</span>
              <span className="xs:hidden">{wpm}</span>
            </span>
            <div className="flex items-center gap-0.5 ml-1 border-l border-[#D6D2C4] pl-1">
              <button
                onClick={() => onUpdateWpm(Math.max(10, wpm - 5))}
                className="w-5 h-5 rounded-full bg-white hover:bg-[#121212] hover:text-white text-[#121212] flex items-center justify-center font-bold text-[10px] shadow-2xs transition-colors"
                title="Reducir velocidad (-5 WPM)"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => onUpdateWpm(Math.min(320, wpm + 5))}
                className="w-5 h-5 rounded-full bg-white hover:bg-[#121212] hover:text-white text-[#121212] flex items-center justify-center font-bold text-[10px] shadow-2xs transition-colors"
                title="Aumentar velocidad (+5 WPM)"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}

        {/* Recording Button (Primary Action) */}
        {onToggleRecord && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleRecord}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all shadow-editorial ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border border-red-400'
                  : 'bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-400'
              }`}
              title={isRecording ? 'Detener grabación de video' : 'Iniciar grabación de video HD'}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{formatRecTime(recordingSeconds)}</span>
                  <span className="text-[9px] uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded-xs">
                    DETENER
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <span className="hidden sm:inline">Grabar Video</span>
                  <span className="sm:hidden">REC</span>
                </>
              )}
            </button>

            {/* Saved Takes Modal Opener */}
            {takesCount > 0 && onOpenRecordingModal && (
              <button
                onClick={onOpenRecordingModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white hover:bg-[#EFECE6] border border-[#D6D2C4] text-[#121212] text-xs font-mono font-bold transition-colors"
                title="Ver tomas de video grabadas"
              >
                <Film className="w-3.5 h-3.5 text-[#121212]" />
                <span>{takesCount}</span>
              </button>
            )}
          </div>
        )}

        {/* Playback status chip */}
        <button
          onClick={onTogglePlay}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-mono font-bold transition-all border ${
            playbackStatus === 'playing'
              ? 'bg-[#121212] text-white border-[#121212] shadow-sm'
              : 'bg-white text-[#666] border-[#E0DDD5] hover:text-[#121212] hover:border-[#121212]'
          }`}
        >
          {playbackStatus === 'playing' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>EN VIVO</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#999]" />
              <span>PAUSA</span>
            </>
          )}
        </button>

        {/* Voice Follow Toggle */}
        <button
          onClick={onToggleVoice}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all relative ${
            isVoiceActive
              ? 'bg-[#121212] text-white border-[#121212]'
              : 'bg-white text-[#555] border-[#E0DDD5] hover:border-[#121212] hover:text-[#121212]'
          }`}
          title={isVoiceActive ? 'Seguimiento por voz ACTIVO' : 'Activar seguimiento inteligente por voz'}
        >
          <Mic className="w-4 h-4" />
          {isVoiceActive && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          )}
        </button>

        {/* Donation Button (Culqi & Yape for EBYZOM E.I.R.L.) */}
        {onOpenDonation && (
          <button
            onClick={onOpenDonation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-mono font-bold transition-all shadow-editorial active:scale-95 border border-red-500/50"
            title="Hacer una donación voluntaria a EBYZOM E.I.R.L. con Tarjeta o Yape (desde S/ 1)"
          >
            <Heart className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
            <span className="hidden md:inline">Donar</span>
            <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded-xs font-normal">S/ 1+</span>
          </button>
        )}

        {/* AI Script Assistant */}
        <button
          onClick={onOpenAIModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white text-[10px] uppercase tracking-widest font-bold transition-all shadow-xs"
          title="Asistente de Guiones con IA Gemini 3.7"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F9F7F2]" />
          <span className="hidden sm:inline">IA Guionista</span>
        </button>

        {/* Audio Rehearsal TTS */}
        <button
          onClick={onToggleAudioRehearsal}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
            isAudioRehearsing
              ? 'bg-[#121212] text-white border-[#121212]'
              : 'bg-white text-[#555] border-[#E0DDD5] hover:border-[#121212] hover:text-[#121212]'
          }`}
          title={isAudioRehearsing ? 'Detener lectura de ensayo' : 'Escuchar ensayo de audio (TTS)'}
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* User Manual */}
        {onOpenManual && (
          <button
            onClick={onOpenManual}
            className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] hover:border-[#121212] hover:text-[#121212] flex items-center justify-center transition-colors hidden sm:flex"
            title="Manual de Usuario"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        {/* Keyboard Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] hover:border-[#121212] hover:text-[#121212] flex items-center justify-center transition-colors hidden sm:flex"
          title="Atajos de Teclado"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Settings Modal */}
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] hover:border-[#121212] hover:text-[#121212] flex items-center justify-center transition-colors"
          title="Configuración de Teleprompter"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] text-[#555] hover:border-[#121212] hover:text-[#121212] flex items-center justify-center transition-colors"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
