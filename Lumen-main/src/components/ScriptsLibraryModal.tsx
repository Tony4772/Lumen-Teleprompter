import React, { useState, useRef } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Search, 
  Clock, 
  FileText, 
  ArrowRight,
  Sparkles,
  Upload,
  FileCheck
} from 'lucide-react';
import { Script } from '../types';
import { countWords, estimateDurationSeconds, formatTime } from '../utils/prompterUtils';
import { parseDocumentFile } from '../utils/documentParser';

interface ScriptsLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scripts: Script[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onCreateScript: () => void;
  onDeleteScript: (id: string) => void;
  onCloneScript: (script: Script) => void;
  onOpenAIModal: () => void;
  onImportScript?: (newScript: Script) => void;
}

export const ScriptsLibraryModal: React.FC<ScriptsLibraryModalProps> = ({
  isOpen,
  onClose,
  scripts,
  activeScriptId,
  onSelectScript,
  onCreateScript,
  onDeleteScript,
  onCloneScript,
  onOpenAIModal,
  onImportScript,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatusMessage(null);

    try {
      const parsed = await parseDocumentFile(file);
      if (parsed.content) {
        const importedScript: Script = {
          id: `script-${Date.now()}`,
          title: parsed.title,
          content: parsed.content,
          targetWPM: 135,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: parsed.fileType.toUpperCase(),
        };

        if (onImportScript) {
          onImportScript(importedScript);
        }
        setImportStatusMessage(`¡Archivo "${file.name}" importado exitosamente! (${parsed.wordCount} palabras)`);
        setTimeout(() => setImportStatusMessage(null), 3500);
      }
    } catch (err: any) {
      console.error(err);
      setImportStatusMessage(`Error: ${err.message || 'No se pudo procesar el archivo.'}`);
      setTimeout(() => setImportStatusMessage(null), 4500);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const categories = ['Todos', ...Array.from(new Set(scripts.map((s) => s.category || 'General')))];

  const filteredScripts = scripts.filter((script) => {
    const matchesSearch = 
      script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || script.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-[#121212]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92dvh] bg-[#F9F7F2] border border-[#E0DDD5] rounded-xs shadow-editorial-lg flex flex-col overflow-hidden text-[#121212]">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#F4F1EA] border-b border-[#E0DDD5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#121212] text-white flex items-center justify-center shadow-xs">
              <FolderOpen className="w-4 h-4 text-[#F9F7F2]" />
            </div>
            <div>
              <h2 className="text-base font-serif italic font-bold text-[#121212]">
                Biblioteca de Guiones & Discursos
              </h2>
              <p className="text-xs text-[#666]">
                {scripts.length} guiones listos para transmisión
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Document Button */}
            <label 
              className={`px-3.5 py-1.5 rounded-full bg-white hover:bg-[#121212] hover:text-white text-[#121212] border border-[#E0DDD5] text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                isImporting ? 'opacity-50 pointer-events-none' : ''
              }`}
              title="Importar archivo PDF, DOCX, TXT o MD"
            >
              {isImporting ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Importar</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                onChange={handleFileImport}
                className="hidden"
                disabled={isImporting}
              />
            </label>

            <button
              onClick={() => {
                onCreateScript();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#666] flex items-center justify-center transition-colors shadow-2xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status / Error Toast Bar */}
        {importStatusMessage && (
          <div className="px-5 py-2 bg-[#EFECE6] border-b border-[#E0DDD5] text-xs font-mono flex items-center gap-2 text-[#121212] animate-in fade-in">
            <FileCheck className="w-4 h-4 text-[#121212] shrink-0" />
            <span>{importStatusMessage}</span>
          </div>
        )}

        {/* Search & Category Filter Bar */}
        <div className="p-4 bg-[#EFECE6] border-b border-[#E0DDD5] flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white text-[#121212] text-xs rounded-xs border border-[#E0DDD5] focus:outline-none focus:border-[#121212] placeholder-[#888]"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-semibold rounded-xs border transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#121212] text-white border-[#121212]'
                    : 'bg-white text-[#666] border-[#E0DDD5] hover:text-[#121212]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Script Cards Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
          {filteredScripts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <FileText className="w-8 h-8 text-[#999]" />
              <p className="text-sm font-serif italic text-[#666]">
                No se encontraron guiones con "{searchTerm}".
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('Todos');
                }}
                className="text-xs uppercase tracking-widest font-bold underline text-[#121212]"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            filteredScripts.map((script) => {
              const isSelected = script.id === activeScriptId;
              const words = countWords(script.content);
              const estTime = estimateDurationSeconds(words, script.targetWPM || 135);

              return (
                <div
                  key={script.id}
                  className={`p-4 rounded-xs border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                    isSelected
                      ? 'bg-white border-[#121212] ring-1 ring-[#121212]'
                      : 'bg-white border-[#E0DDD5] hover:border-[#121212]'
                  }`}
                >
                  {/* Script Meta & Excerpt */}
                  <div 
                    onClick={() => {
                      onSelectScript(script.id);
                      onClose();
                    }}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm sm:text-base font-serif italic font-bold text-[#121212]">
                        {script.title}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-mono font-bold bg-[#121212] text-white">
                          ACTIVO
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#666] line-clamp-2 mb-2 font-serif">
                      {script.content.replace(/\[.*?\]/g, '').trim() || 'Sin texto...'}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#888]">
                      <span>{words} palabras</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#121212]" />
                        <span>~{formatTime(estTime)}</span>
                      </span>
                      <span>•</span>
                      <span className="text-[#121212] font-semibold">{script.category || 'General'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onCloneScript(script)}
                      className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#121212] flex items-center justify-center transition-colors shadow-2xs"
                      title="Duplicar guión"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {scripts.length > 1 && (
                      <button
                        onClick={() => onDeleteScript(script.id)}
                        className="w-8 h-8 rounded-full bg-[#F4F1EA] hover:bg-[#b00020] hover:text-white border border-[#E0DDD5] text-[#666] flex items-center justify-center transition-colors shadow-2xs"
                        title="Eliminar guión"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onSelectScript(script.id);
                        onClose();
                      }}
                      className="px-4 py-1.5 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1 shadow-2xs transition-all"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-[#F4F1EA] border-t border-[#E0DDD5] flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenAIModal();
            }}
            className="flex items-center gap-1.5 text-xs font-serif italic font-bold text-[#121212] hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#121212]" />
            <span>¿Necesitas un nuevo guión? Escríbelo con IA</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-xs font-bold uppercase tracking-widest text-[#121212] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
