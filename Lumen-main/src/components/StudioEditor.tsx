import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Sparkles, 
  Tag, 
  Clock, 
  Check, 
  FolderOpen,
  Volume2,
  Type,
  ArrowRight,
  Heart
} from 'lucide-react';
import { Script } from '../types';
import { countWords, estimateDurationSeconds, formatTime } from '../utils/prompterUtils';
import { parseDocumentFile } from '../utils/documentParser';

interface StudioEditorProps {
  scripts: Script[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onUpdateScript: (updatedScript: Script) => void;
  onCreateScript: () => void;
  onDeleteScript: (id: string) => void;
  onCloneScript: (script: Script) => void;
  onOpenAIModal: () => void;
  onInsertCue: (cueTag: string) => void;
  onLaunchPrompter?: () => void;
  onOpenDonation?: () => void;
}

const COMMON_CUES = [
  { label: 'Pausa 2s', tag: '[PAUSA 2s]', style: 'bg-white text-[#121212] border-[#E0DDD5] hover:bg-[#121212] hover:text-white' },
  { label: 'Mirar Cámara', tag: '[MIRAR A CÁMARA]', style: 'bg-[#E5E2D9] text-[#121212] border-[#D6D2C4] hover:bg-[#121212] hover:text-white' },
  { label: 'Sonreír', tag: '[SONREÍR]', style: 'bg-white text-[#121212] border-[#E0DDD5] hover:bg-[#121212] hover:text-white' },
  { label: 'Énfasis', tag: '[ÉNFASIS]', style: 'bg-[#121212] text-white border-[#121212]' },
  { label: 'Cambio Slide', tag: '[CAMBIO SLIDE]', style: 'bg-white text-[#121212] border-[#E0DDD5] hover:bg-[#121212] hover:text-white' },
  { label: 'Respirar', tag: '[RESPIRAR PROFUNDO]', style: 'bg-[#E5E2D9] text-[#121212] border-[#D6D2C4] hover:bg-[#121212] hover:text-white' },
];

export const StudioEditor: React.FC<StudioEditorProps> = ({
  scripts,
  activeScriptId,
  onSelectScript,
  onUpdateScript,
  onCreateScript,
  onDeleteScript,
  onCloneScript,
  onOpenAIModal,
  onLaunchPrompter,
  onOpenDonation,
}) => {
  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [editorFont, setEditorFont] = useState<'serif' | 'sans' | 'mono'>('serif');

  const wordCount = countWords(activeScript?.content || '');
  const estimatedSeconds = estimateDurationSeconds(wordCount, activeScript?.targetWPM || 135);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeScript) return;
    onUpdateScript({
      ...activeScript,
      content: e.target.value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeScript) return;
    onUpdateScript({
      ...activeScript,
      title: e.target.value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleInsertCue = (tag: string) => {
    if (!textareaRef.current || !activeScript) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = activeScript.content;

    const newText =
      currentText.substring(0, start) +
      `\n${tag}\n` +
      currentText.substring(end);

    onUpdateScript({
      ...activeScript,
      content: newText,
      updatedAt: new Date().toISOString(),
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 50);
  };

  const handleExportTxt = () => {
    if (!activeScript) return;
    const element = document.createElement('a');
    const file = new Blob([activeScript.content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${activeScript.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScript) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const parsed = await parseDocumentFile(file);
      if (parsed.content) {
        onUpdateScript({
          ...activeScript,
          title: parsed.title,
          content: parsed.content,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Error al importar el documento');
      setTimeout(() => setImportError(null), 4000);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyContent = () => {
    if (!activeScript) return;
    navigator.clipboard.writeText(activeScript.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F9F7F2] border-r border-[#E0DDD5] select-none text-[#121212] overflow-hidden">
      {/* Top Script Selector & Controls Bar */}
      <div className="p-3 sm:p-4 border-b border-[#E0DDD5] bg-[#F4F1EA] flex flex-col gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Script Dropdown */}
          <div className="relative flex-1">
            <select
              value={activeScriptId}
              onChange={(e) => onSelectScript(e.target.value)}
              className="w-full bg-white text-[11px] sm:text-xs font-semibold rounded-xs px-2.5 py-1.5 border border-[#E0DDD5] focus:outline-none focus:border-[#121212] truncate cursor-pointer shadow-2xs"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({countWords(s.content)} palabras)
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onCreateScript}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-colors shadow-2xs"
              title="Nuevo Guión"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onCloneScript(activeScript)}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-colors shadow-2xs"
              title="Duplicar Guión"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {scripts.length > 1 && (
              <button
                onClick={() => onDeleteScript(activeScript.id)}
                className="w-8 h-8 rounded-full bg-white hover:bg-[#b00020] text-[#666] hover:text-white border border-[#E0DDD5] flex items-center justify-center transition-colors shadow-2xs"
                title="Eliminar Guión"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Script Title Edit Field */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <input
            type="text"
            value={activeScript?.title || ''}
            onChange={handleTitleChange}
            placeholder="Título del Guión..."
            className="flex-1 bg-transparent text-base sm:text-lg font-serif italic font-bold text-[#121212] border-b border-transparent hover:border-[#D6D2C4] focus:border-[#121212] px-0.5 py-0.5 focus:outline-none transition-colors"
          />

          <button
            onClick={onOpenAIModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white text-[10px] uppercase tracking-widest font-bold shadow-2xs transition-all shrink-0"
            title="Optimizar guión con Gemini AI"
          >
            <Sparkles className="w-3 h-3 text-[#F9F7F2]" />
            <span>IA Atelier</span>
          </button>
        </div>

        {/* Technical Stats Readout */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#666] pt-0.5 sm:pt-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[#121212] font-semibold">{wordCount} pal.</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#121212]" />
              <span className="text-[#121212] font-medium">{formatTime(estimatedSeconds)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                if (editorFont === 'serif') setEditorFont('sans');
                else if (editorFont === 'sans') setEditorFont('mono');
                else setEditorFont('serif');
              }}
              className="px-1.5 py-0.5 rounded-xs text-[9px] uppercase tracking-wider bg-white text-[#121212] hover:bg-[#121212] hover:text-white border border-[#E0DDD5] transition-colors"
              title="Tipografía"
            >
              {editorFont.slice(0, 4)}
            </button>

            <button
              onClick={handleCopyContent}
              className="p-1 text-[#666] hover:text-[#121212] transition-colors"
              title="Copiar texto al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#121212]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleExportTxt}
              className="p-1 text-[#666] hover:text-[#121212] transition-colors"
              title="Descargar archivo (.txt)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label className={`p-1 text-[#666] hover:text-[#121212] cursor-pointer transition-colors ${isImporting ? 'opacity-50 pointer-events-none' : ''}`} title="Importar documento (.txt, .md, .pdf, .docx)">
              {isImporting ? (
                <div className="w-3.5 h-3.5 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                onChange={handleImportFile}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>
        </div>

        {/* Error notification banner if any */}
        {importError && (
          <div className="px-3 py-1.5 bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] rounded-xs text-[11px] font-mono">
            {importError}
          </div>
        )}
      </div>

      {/* Speaker Cue Inserter Ribbon (Editorial Style) */}
      <div className="px-3 py-1.5 bg-[#EFECE6] border-b border-[#E0DDD5] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[8px] font-mono text-[#666] tracking-widest uppercase shrink-0 mr-1 flex items-center gap-1">
          <Tag className="w-2.5 h-2.5 text-[#121212]" />
          CUES:
        </span>
        {COMMON_CUES.map((cue) => (
          <button
            key={cue.tag}
            onClick={() => handleInsertCue(cue.tag)}
            className={`px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold tracking-wider uppercase border shrink-0 transition-all shadow-2xs ${cue.style}`}
          >
            {cue.label}
          </button>
        ))}
      </div>

      {/* Script Text Area (Editorial Paper) */}
      <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col bg-[#F9F7F2] relative">
        <textarea
          ref={textareaRef}
          value={activeScript?.content || ''}
          onChange={handleTextChange}
          placeholder="Escribe o pega aquí el guión de tu teleprompter...
Usa corchetes para agregar anotaciones escénicas, como [PAUSA 2s] o [MIRAR A CÁMARA]."
          className={`w-full h-full p-4 sm:p-6 bg-white text-[#121212] text-sm sm:text-base leading-relaxed rounded-xs border border-[#E0DDD5] focus:border-[#121212] focus:outline-none resize-none shadow-editorial custom-scrollbar ${
            editorFont === 'serif' ? 'font-serif' : editorFont === 'mono' ? 'font-mono' : 'font-sans'
          }`}
          spellCheck="false"
        />

        {/* Mobile Launch Prompter Floating Button */}
        {onLaunchPrompter && (
          <button
            onClick={onLaunchPrompter}
            className="md:hidden absolute bottom-6 right-6 z-20 px-4 py-2.5 rounded-full bg-[#121212] text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-editorial hover:bg-[#2a2a2a] active:scale-95 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Teleprompter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Hint & Copyright */}
      <div className="px-4 py-2 bg-[#F4F1EA] border-t border-[#E0DDD5] text-[10px] text-[#666] font-mono flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#121212]">© EBYZOM E.I.R.L.</span>
          <span className="text-[#AAA]">•</span>
          <span className="hidden sm:inline">Todos los derechos reservados</span>

          {onOpenDonation && (
            <>
              <span className="text-[#AAA]">•</span>
              <button
                onClick={onOpenDonation}
                className="text-red-600 font-bold hover:underline flex items-center gap-1"
              >
                <Heart className="w-2.5 h-2.5 fill-current" />
                Apoyar Proyecto
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-[#888]">Etiquetas [CUE] formateadas</span>
          <span className="uppercase tracking-widest text-[#999]">Auto-guardado</span>
        </div>
      </div>
    </div>
  );
};
