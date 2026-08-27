import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Type, 
  Gauge, 
  Eye, 
  FlipHorizontal, 
  Mic, 
  Camera, 
  Volume2, 
  Clock, 
  ChevronUp, 
  ChevronDown,
  Sliders,
  Plus,
  Minus,
  Square,
  Film
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
  isMobileScreen = false,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecord,
  onOpenRecordingModal,
  takesCount = 0,
}) => {
  const isPlaying = playbackStatus === 'playing';
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const formatRecTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerHaptic = (duration = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (e) {
        // Ignored
      }
    }
  };

  return (
    <div className="w-full bg-[#F9F7F2]/95 backdrop-blur-md border-t border-[#E0DDD5] px-2 sm:px-8 py-2 sm:py-3 select-none z-30 transition-all shadow-editorial">
      
      {/* Mobile Drawer Toggle Header */}
      <div className="md:hidden flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E0DDD5]/70">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#121212]">
          <Clock className="w-3 h-3" />
          <span>{formatTime(elapsedSeconds)} / {formatTime(totalEstimatedSeconds)}</span>
        </div>

        <button
          onClick={() => {
            triggerHaptic(10);
            setIsMobileExpanded(!isMobileExpanded);
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#121212] text-white text-[9px] uppercase tracking-wider font-bold shadow-2xs active:scale-95"
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>{isMobileExpanded ? 'Cerrar' : 'Ajustes'}</span>
          {isMobileExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
        </button>
      </div>

      {/* Expanded Quick Sliders on Mobile */}
      {isMobileExpanded && (
        <div className="md:hidden grid grid-cols-2 gap-3 mb-3 p-3 bg-white rounded-xs border border-[#E0DDD5] animate-slide-up shadow-2xs">
          {/* Speed Stepper */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#121212]">
              <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Velocidad</span>
              <span>{settings.wpm} WPM</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  triggerHaptic(15);
                  onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) });
                }}
                className="w-8 h-8 rounded-xs bg-[#F4F1EA] text-[#121212] flex items-center justify-center font-bold text-sm active:scale-95"
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
                className="flex-1 h-1.5 bg-[#D6D2C4] rounded-xs appearance-none accent-[#121212]"
              />
              <button
                onClick={() => {
                  triggerHaptic(15);
                  onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) });
                }}
                className="w-8 h-8 rounded-xs bg-[#F4F1EA] text-[#121212] flex items-center justify-center font-bold text-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Font Size Stepper */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#121212]">
              <span className="flex items-center gap-1"><Type className="w-3 h-3" /> Letra</span>
              <span>{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  triggerHaptic(15);
                  onUpdateSettings({ fontSize: Math.max(20, settings.fontSize - 2) });
                }}
                className="w-8 h-8 rounded-xs bg-[#F4F1EA] text-[#121212] flex items-center justify-center font-bold text-sm active:scale-95"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="20"
                max="120"
                step="2"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-[#D6D2C4] rounded-xs appearance-none accent-[#121212]"
              />
              <button
                onClick={() => {
                  triggerHaptic(15);
                  onUpdateSettings({ fontSize: Math.min(120, settings.fontSize + 2) });
                }}
                className="w-8 h-8 rounded-xs bg-[#F4F1EA] text-[#121212] flex items-center justify-center font-bold text-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Control Strip */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6">
        
        {/* Telemetry & Quick Speed Display (Left Block) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-3 text-xs font-mono text-[#121212]">
          {/* Elapsed & Estimated Time */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xs border border-[#E0DDD5] shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#121212]" />
            <span className="text-[#121212] font-bold">{formatTime(elapsedSeconds)}</span>
            <span className="text-[#999]">/</span>
            <span className="text-[#666]">{formatTime(totalEstimatedSeconds)}</span>
          </div>

          {/* Word Count (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xs border border-[#E0DDD5] shadow-2xs">
            <span className="text-[10px] uppercase tracking-wider text-[#888]">PALABRAS:</span>
            <span className="text-[#121212] font-bold">{wordCount}</span>
          </div>

          {/* Mobile Direct Speed Regulator Stepper (Always Visible on Mobile) */}
          <div className="md:hidden flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-[#121212] shadow-2xs">
            <span className="text-[9px] uppercase tracking-wider text-[#888] font-bold pl-1 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-[#121212]" /> VEL:
            </span>
            <button
              onClick={() => {
                triggerHaptic(15);
                onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) });
              }}
              className="w-7 h-7 rounded-full bg-[#F4F1EA] text-[#121212] hover:bg-[#121212] hover:text-white flex items-center justify-center font-bold active:scale-90 transition-colors"
              title="Disminuir velocidad (-5 WPM)"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono font-bold text-[#121212] min-w-[55px] text-center">
              {settings.wpm} <span className="text-[9px] text-[#888]">WPM</span>
            </span>
            <button
              onClick={() => {
                triggerHaptic(15);
                onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) });
              }}
              className="w-7 h-7 rounded-full bg-[#F4F1EA] text-[#121212] hover:bg-[#121212] hover:text-white flex items-center justify-center font-bold active:scale-90 transition-colors"
              title="Aumentar velocidad (+5 WPM)"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Primary Central Playback Controls (Editorial Ink Buttons) */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-full md:w-auto">
          {/* Restart to Beginning */}
          <button
            onClick={() => {
              triggerHaptic(25);
              onRestart();
            }}
            className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-all shadow-2xs active:scale-90"
            title="Reiniciar al inicio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Rewind 5s */}
          <button
            onClick={() => {
              triggerHaptic(15);
              onNudgeBackward();
            }}
            className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-all shadow-2xs active:scale-90"
            title="Retroceder 5s"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            onClick={() => {
              triggerHaptic(30);
              onTogglePlay();
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white flex items-center justify-center shadow-editorial transition-all hover:scale-105 active:scale-95 shrink-0"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current stroke-[2]" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5 stroke-[2]" />
            )}
          </button>

          {/* Fast Forward 5s */}
          <button
            onClick={() => {
              triggerHaptic(15);
              onNudgeForward();
            }}
            className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-all shadow-2xs active:scale-90"
            title="Avanzar 5s"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          {/* Record Video Button (Mobile optimized) */}
          {onToggleRecord && (
            <button
              onClick={() => {
                triggerHaptic(30);
                onToggleRecord();
              }}
              className={`h-10 sm:h-10 px-3 rounded-full border flex items-center gap-1.5 font-mono text-[10px] sm:text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse'
                  : 'bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-400'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>{formatRecTime(recordingSeconds)}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  <span>REC</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* PROMINENT SPEED REGULATOR & FONT CONTROLS (Desktop) */}
        <div className="hidden md:flex items-center gap-4 sm:gap-6 justify-end">
          
          {/* Main High-Visibility Speed Regulator Unit */}
          <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xs border border-[#121212] shadow-2xs">
            <Gauge className="w-4 h-4 text-[#121212] shrink-0" />
            
            <div className="flex flex-col gap-1 w-32 sm:w-36">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="font-bold text-[#121212] uppercase tracking-wider">VELOCIDAD</span>
                <span className="font-black text-[#121212] bg-[#F4F1EA] px-1.5 py-0.5 rounded-xs border border-[#E0DDD5]">
                  {settings.wpm} WPM
                </span>
              </div>

              {/* Slider with Quick Steppers */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) });
                  }}
                  className="w-5 h-5 rounded-xs bg-[#F4F1EA] hover:bg-[#121212] hover:text-white text-[#121212] flex items-center justify-center font-bold text-xs active:scale-90 transition-colors"
                  title="Reducir 5 WPM"
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
                  title={`Velocidad actual: ${settings.wpm} palabras por minuto`}
                />

                <button
                  onClick={() => {
                    triggerHaptic(15);
                    onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) });
                  }}
                  className="w-5 h-5 rounded-xs bg-[#F4F1EA] hover:bg-[#121212] hover:text-white text-[#121212] flex items-center justify-center font-bold text-xs active:scale-90 transition-colors"
                  title="Aumentar 5 WPM"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Font Size Stepper */}
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#121212]" />
            <div className="flex flex-col gap-1 w-20 sm:w-24">
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

          {/* Safe Margin / Reading Line Nudge */}
          <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-[#E0DDD5]">
            <button
              onClick={() =>
                onUpdateSettings({
                  readerLinePosition: Math.max(15, settings.readerLinePosition - 5),
                })
              }
              className="p-1.5 rounded-xs bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#121212] transition-colors"
              title="Subir línea de lectura"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                onUpdateSettings({
                  readerLinePosition: Math.min(75, settings.readerLinePosition + 5),
                })
              }
              className="p-1.5 rounded-xs bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#121212] transition-colors"
              title="Bajar línea de lectura"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
