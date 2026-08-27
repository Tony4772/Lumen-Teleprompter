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
} from 'lucide-react';

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
  recordingSeconds: number;
  onToggleRecord?: () => void;
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
  recordingSeconds,
  onToggleRecord,
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

  const formatRecTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        opts?.active ? 'bg-[#EFECE6]' : 'bg-white'
      }`}
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          opts?.danger
            ? 'bg-red-600 text-white'
            : opts?.active
            ? 'bg-[#121212] text-white'
            : 'bg-[#F4F1EA] text-[#121212]'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[#121212]">{label}</span>
        {opts?.hint && (
          <span className="block text-[11px] text-[#888] font-mono mt-0.5 truncate">{opts.hint}</span>
        )}
      </span>
      {opts?.active && (
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          ON
        </span>
      )}
    </button>
  );

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <div className="relative bg-[#F9F7F2] rounded-t-2xl shadow-editorial-lg border-t border-[#E0DDD5] max-h-[78dvh] overflow-y-auto safe-bottom animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-[#F9F7F2] z-10 flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#E0DDD5]">
          <div>
            <p className="text-sm font-serif italic font-bold text-[#121212]">Más opciones</p>
            <p className="text-[10px] font-mono text-[#888] uppercase tracking-wider">Todo en un solo lugar</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E0DDD5] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-[#E0DDD5]">
          {row('Mis guiones', <FolderOpen className="w-4 h-4" />, () => run(onOpenLibrary), {
            hint: 'Biblioteca y documentos',
          })}
          {row('Cámara', <Camera className="w-4 h-4" />, () => {
            onToggleCamera();
            onClose();
          }, {
            active: isCameraActive,
            hint: isCameraActive ? 'Toca para apagar' : 'Ventana flotante sobre el texto',
          })}
          {isCameraActive && onCycleCameraLayout && (
            row('Vista de cámara', <Camera className="w-4 h-4" />, () => {
              onCycleCameraLayout();
            }, {
              hint: `Actual: ${cameraLayoutLabel || 'Flotante'} · toca para cambiar`,
            })
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
            hint: 'El texto avanza cuando hablas',
          })}
          {onToggleRecord &&
            row(
              isRecording ? `Detener ${formatRecTime(recordingSeconds)}` : 'Grabar video',
              isRecording ? <Square className="w-4 h-4 fill-current" /> : <span className="w-2.5 h-2.5 rounded-full bg-red-600" />,
              () => {
                onToggleRecord();
                onClose();
              },
              { danger: isRecording, hint: 'Graba cámara + audio' }
            )}
          {takesCount > 0 && onOpenRecordingModal &&
            row('Tomas guardadas', <Film className="w-4 h-4" />, () => run(onOpenRecordingModal), {
              hint: `${takesCount} video${takesCount === 1 ? '' : 's'}`,
            })}
          {row('Asistente IA', <Sparkles className="w-4 h-4" />, () => run(onOpenAI), {
            hint: 'Generar o mejorar guiones',
          })}
          {row('Ajustes', <Settings className="w-4 h-4" />, () => run(onOpenSettings), {
            hint: 'Tipografía, colores, cámara…',
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
