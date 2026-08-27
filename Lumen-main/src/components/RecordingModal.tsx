import React, { useState } from 'react';
import { RecordedTake } from '../types';
import { downloadRecordedVideo } from '../hooks/useVideoRecorder';
import { 
  Download, 
  RotateCcw, 
  X, 
  Check, 
  Film, 
  Clock, 
  HardDrive, 
  FileVideo, 
  Trash2, 
  Play, 
  Sparkles,
  Share2
} from 'lucide-react';

interface RecordingModalProps {
  isOpen: boolean;
  take: RecordedTake | null;
  takesHistory: RecordedTake[];
  onClose: () => void;
  onRetake: () => void;
  onDeleteTake?: (id: string) => void;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  take,
  takesHistory,
  onClose,
  onRetake,
  onDeleteTake,
}) => {
  const [selectedTake, setSelectedTake] = useState<RecordedTake | null>(take);
  const [customFilename, setCustomFilename] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync selected take when modal opens or primary take changes
  React.useEffect(() => {
    if (take) {
      setSelectedTake(take);
      const cleanTitle = (take.scriptTitle || 'grabacion')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      setCustomFilename(`toma-${cleanTitle}-${new Date().toISOString().slice(0, 10)}`);
    }
  }, [take]);

  if (!isOpen || (!take && !selectedTake)) return null;

  const currentTake = selectedTake || take;
  if (!currentTake) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (currentTake) {
      downloadRecordedVideo(currentTake.blob, customFilename || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#F9F7F2] border-2 border-[#121212] rounded-xs w-full max-w-2xl max-h-[90vh] flex flex-col shadow-editorial-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E0DDD5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic font-bold text-lg text-[#121212] leading-tight">
                Grabación Finalizada
              </h3>
              <p className="text-[11px] font-mono text-[#666] uppercase tracking-wider">
                {currentTake.scriptTitle || 'Toma de Teleprómpter'} • {currentTake.createdAt}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-[#121212] hover:text-white text-[#121212] flex items-center justify-center transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
          
          {/* Main Video Player */}
          <div className="relative w-full aspect-video bg-black rounded-xs overflow-hidden border border-[#121212] shadow-sm flex items-center justify-center">
            <video
              key={currentTake.id}
              src={currentTake.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-3 rounded-xs border border-[#E0DDD5] flex items-center gap-2.5 shadow-2xs">
              <Clock className="w-4 h-4 text-[#121212]" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#777] block">Duración</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-[#121212]">
                  {formatDuration(currentTake.durationSeconds)}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xs border border-[#E0DDD5] flex items-center gap-2.5 shadow-2xs">
              <HardDrive className="w-4 h-4 text-[#121212]" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#777] block">Tamaño</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-[#121212]">
                  {currentTake.fileSizeMb} MB
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xs border border-[#E0DDD5] flex items-center gap-2.5 shadow-2xs">
              <FileVideo className="w-4 h-4 text-[#121212]" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#777] block">Formato</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-[#121212] uppercase">
                  {currentTake.mimeType.includes('mp4') ? 'MP4 HD' : 'WEBM HD'}
                </span>
              </div>
            </div>
          </div>

          {/* Filename Editor */}
          <div className="bg-white p-4 rounded-xs border border-[#E0DDD5] flex flex-col gap-2 shadow-2xs">
            <label className="text-xs font-semibold text-[#121212] flex items-center justify-between">
              <span>Nombre de archivo para guardar:</span>
              <span className="text-[10px] font-mono text-[#888]">
                .{currentTake.mimeType.includes('mp4') ? 'mp4' : 'webm'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Nombre del video..."
                className="flex-1 px-3 py-2 text-xs font-mono bg-[#F9F7F2] border border-[#D6D2C4] rounded-xs focus:outline-none focus:border-[#121212]"
              />
            </div>
          </div>

          {/* Session Takes History (if more than 1 take exists) */}
          {takesHistory.length > 1 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E0DDD5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#666] font-bold">
                Historial de Tomas de esta sesión ({takesHistory.length})
              </span>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                {takesHistory.map((t, index) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTake(t)}
                    className={`px-3 py-2 rounded-xs border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      currentTake.id === t.id
                        ? 'border-[#121212] bg-[#EFECE6] font-bold'
                        : 'border-[#E0DDD5] bg-white hover:bg-[#F9F7F2]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-3 h-3 text-[#121212]" />
                      <span>Toma #{takesHistory.length - index} ({formatDuration(t.durationSeconds)})</span>
                      <span className="text-[10px] text-[#888] font-mono">{t.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadRecordedVideo(t.blob, `toma-${takesHistory.length - index}`);
                        }}
                        className="p-1 hover:text-green-700 text-[#121212]"
                        title="Descargar esta toma"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteTake && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTake(t.id);
                          }}
                          className="p-1 hover:text-red-600 text-[#888]"
                          title="Eliminar toma"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-[#E0DDD5] bg-[#EFECE6] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => {
                onClose();
                onRetake();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xs border border-[#121212] bg-white hover:bg-[#121212] hover:text-white text-[#121212] text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Grabar Nueva Toma</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xs border border-[#D6D2C4] bg-white hover:bg-[#F4F1EA] text-[#666] text-xs font-mono font-bold uppercase transition-colors"
              >
                Cerrar
              </button>

              <button
                onClick={handleDownload}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xs bg-[#121212] text-white hover:bg-black text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-editorial active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Guardar / Descargar Video</span>
              </button>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#888] text-center border-t border-[#E0DDD5] pt-2">
            Lumen Studio Video Engine • © EBYZOM E.I.I.R.L. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
};
