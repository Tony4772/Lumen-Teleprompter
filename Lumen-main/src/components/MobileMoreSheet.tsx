import React from 'react';
import {
  X,
  FolderOpen,
  Camera,
  FlipHorizontal,
  Mic,
  Settings,
  Sparkles,
  Heart,
  Film,
  Square,
  Play,
} from 'lucide-react';
import { PlaybackStatus } from '../types';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  isMirrorActive: boolean;
  onToggleMirror: () => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  isRecording: boolean;
  playbackStatus: PlaybackStatus;
  onTogglePlay: () => void;
  takesCount: number;
  onOpenRecordingModal?: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenAI: () => void;
  onOpenDonation?: () => void;
  cameraLayoutLabel?: string;
  onCycleCameraLayout?: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  isCameraActive,
  onToggleCamera,
  isMirrorActive,
  onToggleMirror,
  isVoiceActive,
  onToggleVoice,
  isRecording,
  playbackStatus,
  onTogglePlay,
  takesCount,
  onOpenRecordingModal,
  onOpenLibrary,
  onOpenSettings,
  onOpenAI,
  onOpenDonation,
  cameraLayoutLabel,
  onCycleCameraLayout,
}) => {
  if (!isOpen) return null;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const row = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    opts?: { active?: boolean; danger?: boolean; hint?: string }
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[#EFECE6] ${
        opts?.danger ? 'text-red-700' : opts?.active ? 'bg-[#EFECE6]' : 'text-[#121212]'
      }`}
    >
      <span
        className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
          opts?.danger
            ? 'border-red-200 bg-red-50 text-red-600'
            : opts?.active
              ? 'border-[#121212] bg-[#121212] text-white'
              : 'border-[#E0DDD5] bg-white'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {opts?.hint && <span className="block text-[11px] text-[#888] mt-0.5">{opts.hint}</span>}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[#121212]/45 backdrop-blur-[2px]"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-[#F9F7F2] rounded-t-2xl border-t border-[#E0DDD5] shadow-editorial-lg max-h-[75vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#E0DDD5]">
          <h2 className="text-sm font-serif italic font-bold">Más opciones</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-[#E0DDD5]/80">
          {row('Biblioteca de guiones', <FolderOpen className="w-4 h-4" />, () => run(onOpenLibrary))}
          {row(
            isCameraActive ? 'Apagar cámara' : 'Encender cámara',
            <Camera className="w-4 h-4" />,
            () => {
              onToggleCamera();
              onClose();
            },
            { active: isCameraActive }
          )}
          {onCycleCameraLayout &&
            row(
              `Layout cámara: ${cameraLayoutLabel || 'PiP'}`,
              <Camera className="w-4 h-4" />,
              () => {
                onCycleCameraLayout();
                onClose();
              },
              { hint: 'Flotante / Dividido / Fondo' }
            )}
          {row('Modo espejo', <FlipHorizontal className="w-4 h-4" />, () => {
            onToggleMirror();
            onClose();
          }, {
            active: isMirrorActive,
            hint: 'Para teleprompter físico / beam-splitter',
          })}
          {row('Seguimiento por voz', <Mic className="w-4 h-4" />, () => {
            onToggleVoice();
            onClose();
          }, {
            active: isVoiceActive,
            hint: 'El texto avanza cuando hablas (Chrome/Edge)',
          })}
          {row(
            isRecording || playbackStatus === 'playing'
              ? 'Pausar / detener grabación'
              : 'Iniciar (texto + grabar)',
            isRecording ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />,
            () => {
              onTogglePlay();
              onClose();
            },
            {
              danger: isRecording,
              hint: 'Un solo botón: mueve el texto y graba la cámara',
            }
          )}
          {takesCount > 0 &&
            onOpenRecordingModal &&
            row('Tomas guardadas', <Film className="w-4 h-4" />, () => run(onOpenRecordingModal), {
              hint: `${takesCount} video${takesCount === 1 ? '' : 's'}`,
            })}
          {row('Asistente IA', <Sparkles className="w-4 h-4" />, () => run(onOpenAI), {
            hint: 'Generar o mejorar guiones',
          })}
          {row('Ajustes', <Settings className="w-4 h-4" />, () => run(onOpenSettings), {
            hint: 'Tipografía, colores, cámara, cuenta regresiva…',
          })}
          {onOpenDonation &&
            row('Donar S/ 1+', <Heart className="w-4 h-4 fill-current" />, () => run(onOpenDonation), {
              danger: true,
              hint: 'Apoya a EBYZOM E.I.R.L.',
            })}
        </div>
      </div>
    </div>
  );
};
