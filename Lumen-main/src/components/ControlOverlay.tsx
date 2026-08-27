import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Type, 
  Gauge, 
  FlipHorizontal, 
  Mic, 
  Camera, 
  Clock, 
  ChevronUp, 
  ChevronDown,
  Plus,
  Minus,
} from 'lucide-react';
import { PrompterSettings, PlaybackStatus } from '../types';
import { formatTime } from '../utils/prompterUtils';

interface ControlOverlayProps {
  settings: PrompterSettings;
  onUpdateSettings: (newSettings: Partial<PrompterSettings>) => void;
  playbackStatus: PlaybackStatus;
  onTogglePlay: () => void;
  onRestart: () => void;
  onNudgeForward: () => void;
  onNudgeBackward: () => void;
  elapsedSeconds: number;
  totalEstimatedSeconds: number;
  wordCount: number;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  isMirrorActive?: boolean;
  onToggleMirror?: () => void;
  isMobileScreen?: boolean;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecord?: () => void;
  onOpenRecordingModal?: () => void;
  takesCount?: number;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  settings,
  onUpdateSettings,
  playbackStatus,
  onTogglePlay,
  onRestart,
  onNudgeForward,
  onNudgeBackward,
  elapsedSeconds,
  totalEstimatedSeconds,
  wordCount,
  isVoiceActive,
  onToggleVoice,
  isCameraActive,
  onToggleCamera,
  isMirrorActive = false,
  onToggleMirror,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecord,
}) => {
  const isPlaying = playbackStatus === 'playing';
  const [showMobileSpeed, setShowMobileSpeed] = useState(false);

  const formatRecTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerHaptic = (duration = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignored
      }
    }
  };

  return (
    <div className="w-full bg-[#F9F7F2] md:bg-[#F9F7F2]/95 md:backdrop-blur-md border-t border-[#E0DDD5] px-3 sm:px-8 py-2 sm:py-3 select-none z-30 md:shadow-editorial">

      {/* ——— MOBILE: one clean row ——— */}
      <div className="md:hidden flex flex-col gap-2">
        {showMobileSpeed && (
          <div className="flex items-center gap-2 px-1 py-1">
            <Gauge className="w-4 h-4 text-[#121212] shrink-0" />
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) });
              }}
              className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] flex items-center justify-center active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="10"
              max="320"
              step="5"
              value={settings.wpm}
              onChange={(e) => onUpdateSettings({ wpm: Number(e.target.value) })}
              className="flex-1 h-1.5 bg-[#D6D2C4] rounded-xs appearance-none accent-[#121212]"
            />
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) });
              }}
              className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] flex items-center justify-center active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold min-w-[52px] text-right">{settings.wpm}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(25);
              onRestart();
            }}
            className="h-11 px-2.5 rounded-full bg-white border border-[#E0DDD5] flex flex-col items-center justify-center active:scale-90 min-w-[48px]"
            title="Volver al inicio del texto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[8px] font-bold uppercase tracking-wide">Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(30);
              onTogglePlay();
            }}
            className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-editorial active:scale-95 shrink-0 relative ${
              isRecording ? 'bg-red-600 animate-pulse' : 'bg-[#121212]'
            }`}
            title={
              isPlaying || isRecording
                ? 'Pausar texto y detener grabación'
                : 'Iniciar texto + grabar cámara'
            }
          >
            {isPlaying || isRecording ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold px-1 rounded-xs tabular-nums whitespace-nowrap bg-black/75 text-white">
              {isRecording
                ? `REC ${formatRecTime(recordingSeconds)}`
                : isPlaying
                  ? 'EN VIVO'
                  : 'INICIAR'}
            </span>
          </button>

          <div className="h-11 px-1 rounded-full bg-white border border-[#E0DDD5] flex flex-col items-center justify-center min-w-[52px]">
            <span className="text-[7px] font-bold uppercase text-[#888] leading-none">Cuenta</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              {([3, 5, 10] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    onUpdateSettings({ countdownSeconds: sec });
                  }}
                  className={`w-5 h-5 rounded-full text-[9px] font-mono font-bold ${
                    settings.countdownSeconds === sec
                      ? 'bg-[#121212] text-white'
                      : 'bg-[#F4F1EA] text-[#666]'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setShowMobileSpeed((v) => !v);
            }}
            className={`h-11 px-2 rounded-full border flex flex-col items-center justify-center font-mono text-[10px] font-bold active:scale-95 min-w-[48px] ${
              showMobileSpeed
                ? 'bg-[#121212] text-white border-[#121212]'
                : 'bg-white text-[#121212] border-[#E0DDD5]'
            }`}
            title="Velocidad"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{settings.wpm}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onToggleVoice();
            }}
            className={`h-11 px-2 rounded-full border flex flex-col items-center justify-center active:scale-90 relative min-w-[48px] ${
              isVoiceActive
                ? 'bg-emerald-500 text-black border-emerald-400'
                : 'bg-white text-[#121212] border-[#E0DDD5]'
            }`}
            title="Seguimiento por voz: el texto avanza cuando hablas"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="text-[8px] font-bold uppercase">{isVoiceActive ? 'ON' : 'Voz'}</span>
            {isVoiceActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ——— DESKTOP: full controls ——— */}
      <div className="hidden md:flex max-w-7xl mx-auto flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 text-xs font-mono text-[#121212]">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xs border border-[#E0DDD5] shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{formatTime(elapsedSeconds)}</span>
            <span className="text-[#999]">/</span>
            <span className="text-[#666]">{formatTime(totalEstimatedSeconds)}</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xs border border-[#E0DDD5] shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-[#888]">PALABRAS:</span>
            <span className="font-bold">{wordCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { triggerHaptic(25); onRestart(); }}
            className="h-11 px-3 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center gap-1.5 transition-all shadow-2xs"
            title="Volver al inicio del texto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Inicio</span>
          </button>
          <button
            onClick={() => { triggerHaptic(15); onNudgeBackward(); }}
            className="w-10 h-10 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-all shadow-2xs"
            title="Retroceder 5s"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { triggerHaptic(30); onTogglePlay(); }}
            className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-editorial transition-all hover:scale-105 relative ${
              isRecording ? 'bg-red-600 animate-pulse' : 'bg-[#121212] hover:bg-[#2a2a2a]'
            }`}
            title={
              isPlaying || isRecording
                ? 'Pausar texto y detener grabación'
                : 'Iniciar texto + grabar cámara'
            }
          >
            {isPlaying || isRecording ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
            {isRecording && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold bg-black/70 px-1.5 rounded-xs tabular-nums">
                REC {formatRecTime(recordingSeconds)}
              </span>
            )}
          </button>
          <button
            onClick={() => { triggerHaptic(15); onNudgeForward(); }}
            className="w-10 h-10 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-all shadow-2xs"
            title="Avanzar 5s"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <div className="h-10 px-2 rounded-full bg-white border border-[#E0DDD5] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#666]" />
            <span className="text-[9px] font-bold uppercase text-[#888]">Cuenta</span>
            {([3, 5, 10] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onUpdateSettings({ countdownSeconds: sec })}
                className={`w-7 h-7 rounded-full text-[10px] font-mono font-bold ${
                  settings.countdownSeconds === sec
                    ? 'bg-[#121212] text-white'
                    : 'bg-[#F4F1EA] text-[#666] hover:bg-[#E0DDD5]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {onToggleMirror && (
            <button
              onClick={() => { triggerHaptic(15); onToggleMirror(); }}
              className={`h-10 px-3 rounded-full border flex items-center gap-1.5 font-mono text-[10px] font-bold ${
                isMirrorActive ? 'bg-[#121212] text-white border-[#121212]' : 'bg-white text-[#121212] border-[#E0DDD5]'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Espejo</span>
            </button>
          )}

          <button
            onClick={() => { triggerHaptic(15); onToggleVoice(); }}
            className={`h-10 px-3 rounded-full border flex items-center gap-1.5 font-mono text-[10px] font-bold relative ${
              isVoiceActive ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white text-[#121212] border-[#E0DDD5]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isVoiceActive ? 'Voz ON' : 'Voz'}</span>
          </button>

          <button
            onClick={() => { triggerHaptic(15); onToggleCamera(); }}
            className={`h-10 px-3 rounded-full border flex items-center gap-1.5 font-mono text-[10px] font-bold ${
              isCameraActive ? 'bg-amber-400 text-black border-amber-300' : 'bg-white text-[#121212] border-[#E0DDD5]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isCameraActive ? 'Cam ON' : 'Cámara'}</span>
          </button>
        </div>

        <div className="flex items-center gap-6 justify-end">
          <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xs border border-[#121212] shadow-2xs">
            <Gauge className="w-4 h-4 shrink-0" />
            <div className="flex flex-col gap-1 w-36">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="font-bold uppercase tracking-wider">VELOCIDAD</span>
                <span className="font-black bg-[#F4F1EA] px-1.5 py-0.5 rounded-xs border border-[#E0DDD5]">
                  {settings.wpm} WPM
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) })}
                  className="w-5 h-5 rounded-xs bg-[#F4F1EA] hover:bg-[#121212] hover:text-white flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min="10"
                  max="320"
                  step="5"
                  value={settings.wpm}
                  onChange={(e) => onUpdateSettings({ wpm: Number(e.target.value) })}
                  className="flex-1 h-2 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
                />
                <button
                  onClick={() => onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) })}
                  className="w-5 h-5 rounded-xs bg-[#F4F1EA] hover:bg-[#121212] hover:text-white flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <div className="flex flex-col gap-1 w-24">
              <div className="flex justify-between text-[10px] font-mono text-[#666]">
                <span>LETRA</span>
                <span className="text-[#121212] font-bold">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="2"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-[#E0DDD5]">
            <button
              onClick={() => onUpdateSettings({ readerLinePosition: Math.max(15, settings.readerLinePosition - 5) })}
              className="p-1.5 rounded-xs bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5]"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateSettings({ readerLinePosition: Math.min(75, settings.readerLinePosition + 5) })}
              className="p-1.5 rounded-xs bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5]"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
