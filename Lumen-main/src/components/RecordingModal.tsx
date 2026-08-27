import React, { useState, useEffect } from 'react';
import { RecordedTake } from '../types';
import { saveRecordedVideo } from '../hooks/useVideoRecorder';
import {
  RotateCcw,
  X,
  Film,
  Clock,
  HardDrive,
  FileVideo,
  Trash2,
  Play,
  Share2,
} from 'lucide-react';

interface RecordingModalProps {
  isOpen: boolean;
  take: RecordedTake | null;
  takesHistory: RecordedTake[];
  onClose: () => void;
  onRetake: () => void;
  onDeleteTake?: (id: string) => void;
  onClearAllTakes?: () => void;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  take,
  takesHistory,
  onClose,
  onRetake,
  onDeleteTake,
  onClearAllTakes,
}) => {
  const [selectedTake, setSelectedTake] = useState<RecordedTake | null>(null);
  const [customFilename, setCustomFilename] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initial = take || takesHistory[0] || null;
    setSelectedTake(initial);
    setSaveStatus(null);
    if (initial) {
      const cleanTitle = (initial.scriptTitle || 'grabacion')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      setCustomFilename(`toma-${cleanTitle}-${new Date().toISOString().slice(0, 10)}`);
    }
  }, [isOpen, take, takesHistory]);

  if (!isOpen) return null;

  const currentTake = selectedTake || take || takesHistory[0] || null;
  if (!currentTake) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#F9F7F2] border-2 border-[#121212] rounded-xs w-full max-w-md p-6 text-center">
          <p className="text-sm text-[#666] mb-4">No hay tomas en esta sesión.</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xs bg-[#121212] text-white text-xs font-bold uppercase"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async (blob: Blob, name?: string) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const result = await saveRecordedVideo(blob, name || customFilename || undefined);
      setSaveStatus(result.message);
    } catch {
      setSaveStatus('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardCurrent = () => {
    if (!onDeleteTake) return;
    const id = currentTake.id;
    const remaining = takesHistory.filter((t) => t.id !== id);
    onDeleteTake(id);
    if (remaining.length === 0) {
      onClose();
    } else {
      setSelectedTake(remaining[0]);
    }
  };

  const handleDiscardAll = () => {
    onClearAllTakes?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#F9F7F2] border-2 border-[#121212] rounded-xs w-full max-w-2xl max-h-[90vh] flex flex-col shadow-editorial-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[#E0DDD5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic font-bold text-lg text-[#121212] leading-tight">
                Tomas de esta sesión
              </h3>
              <p className="text-[11px] font-mono text-[#666] uppercase tracking-wider">
                {takesHistory.length} toma{takesHistory.length === 1 ? '' : 's'} • en iPhone usa Compartir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-[#121212] hover:text-white text-[#121212] flex items-center justify-center transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
          <div className="relative w-full aspect-video bg-black rounded-xs overflow-hidden border border-[#121212] shadow-sm flex items-center justify-center">
            <video
              key={currentTake.id}
              src={currentTake.url}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-3 rounded-xs border border-[#E0DDD5] flex items-center gap-2.5 shadow-2xs">
              <Clock className="w-4 h-4 text-[#121212]" />
              <div>
                <div className="text-[10px] uppercase text-[#888] font-mono">Duración</div>
                <div className="text-sm font-bold font-mono">
                  {formatDuration(currentTake.durationSeconds)}
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xs border border-[#E0DDD5] flex items-center gap-2.5 shadow-2xs">
              <HardDrive className="w-4 h-4 text-[#121212]" />
              <div>
                <div className="text-[10px] uppercase text-[#888] font-mono">Peso</div>
                <div className="text-sm font-bold font-mono">{currentTake.fileSizeMb} MB</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xs border border-[#E0DDD5] flex items-center gap-2.5 shadow-2xs">
              <FileVideo className="w-4 h-4 text-[#121212]" />
              <div>
                <div className="text-[10px] uppercase text-[#888] font-mono">Formato</div>
                <div className="text-sm font-bold font-mono truncate max-w-[5rem]">
                  {(currentTake.mimeType || 'video').split(';')[0].replace('video/', '')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#666] font-bold">
              Nombre al guardar
            </label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="Nombre del video..."
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D2C4] rounded-xs focus:outline-none focus:border-[#121212]"
            />
          </div>

          {takesHistory.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E0DDD5]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#666] font-bold">
                Historial ({takesHistory.length})
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
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
                    <div className="flex items-center gap-2 min-w-0">
                      <Play className="w-3 h-3 text-[#121212] shrink-0" />
                      <span className="truncate">
                        Toma #{takesHistory.length - index} ({formatDuration(t.durationSeconds)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSave(t.blob, `toma-${takesHistory.length - index}`);
                        }}
                        className="p-1.5 hover:text-green-700 text-[#121212]"
                        title="Guardar / Compartir"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteTake && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTake(t.id);
                            if (currentTake.id === t.id) {
                              const remaining = takesHistory.filter((x) => x.id !== t.id);
                              if (remaining.length === 0) onClose();
                              else setSelectedTake(remaining[0]);
                            }
                          }}
                          className="p-1.5 hover:text-red-600 text-[#888]"
                          title="Eliminar"
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

        <div className="p-4 sm:p-5 border-t border-[#E0DDD5] bg-[#EFECE6] flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave(currentTake.blob)}
            className="w-full px-6 py-3 rounded-xs bg-[#121212] text-white hover:bg-black text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-editorial active:scale-95 disabled:opacity-60"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>{isSaving ? 'Abriendo menú…' : 'Compartir / Guardar en iPhone'}</span>
          </button>

          {saveStatus && (
            <p className="text-[11px] font-mono text-[#121212] bg-white border border-[#E0DDD5] rounded-xs px-3 py-2 text-center leading-relaxed">
              {saveStatus}
            </p>
          )}

          <p className="text-[10px] font-mono text-[#666] text-center leading-relaxed">
            En iPhone: toca el botón → en el menú elige <strong>Guardar en Archivos</strong> o{' '}
            <strong>Guardar Video</strong>. Busca luego en Archivos → En mi iPhone / Descargas.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleDiscardCurrent}
              className="flex-1 px-4 py-2.5 rounded-xs border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar esta toma</span>
            </button>
            {takesHistory.length > 1 && onClearAllTakes && (
              <button
                type="button"
                onClick={handleDiscardAll}
                className="flex-1 px-4 py-2.5 rounded-xs border border-red-300 bg-red-600 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar todas</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetake();
              }}
              className="flex-1 px-4 py-2.5 rounded-xs border border-[#121212] bg-white hover:bg-[#121212] hover:text-white text-[#121212] text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nueva toma</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xs border border-[#D6D2C4] bg-white text-[#666] text-xs font-mono font-bold uppercase"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
