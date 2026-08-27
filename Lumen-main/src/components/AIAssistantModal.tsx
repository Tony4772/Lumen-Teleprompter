import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Wand2, 
  Clock, 
  Languages, 
  Sliders, 
  Check, 
  ArrowRight, 
  Loader2,
  FileText,
  RotateCcw,
  Plus,
  Heart
} from 'lucide-react';
import { Script } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScriptContent: string;
  onApplyScript: (newContent: string, newTitle?: string) => void;
  onCreateNewScriptWithContent: (title: string, content: string) => void;
  onOpenDonation?: () => void;
}

type TabType = 'generate' | 'enhance' | 'translate';

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  currentScriptContent,
  onApplyScript,
  onCreateNewScriptWithContent,
  onOpenDonation,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('generate');

  // Generation state
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Keynote / Presentación Principal');
  const [tone, setTone] = useState('Seguro, Inspirador y Claro');
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [language, setLanguage] = useState('Español');

  // Enhancement state
  const [enhanceAction, setEnhanceAction] = useState<'add_cues' | 'natural_spoken' | 'shorten' | 'expand'>('add_cues');
  const [customPrompt, setCustomPrompt] = useState('');

  // Translation state
  const [targetLanguage, setTargetLanguage] = useState('English');

  // Result state
  const [generatedResult, setGeneratedResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMessage('Por favor ingresa el tema o las ideas principales de tu discurso.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          tone,
          format,
          targetDurationMinutes: durationMinutes,
          language,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedResult(data.script || '');
    } catch (err: any) {
      console.error('AI error:', err);
      setErrorMessage(err.message || 'Error al conectar con el motor de IA Gemini');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhance = async (actionOverride?: 'add_cues' | 'natural_spoken' | 'shorten' | 'expand') => {
    if (!currentScriptContent.trim()) {
      setErrorMessage('El guión actual está vacío. Escribe algo primero o usa la pestaña Generar.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/enhance-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: currentScriptContent,
          action: actionOverride || enhanceAction,
          customInstruction: customPrompt,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedResult(data.script || '');
    } catch (err: any) {
      console.error('AI error:', err);
      setErrorMessage(err.message || 'Error al optimizar el guión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!currentScriptContent.trim()) {
      setErrorMessage('El guión actual está vacío.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/enhance-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: currentScriptContent,
          action: 'translate',
          language: targetLanguage,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedResult(data.script || '');
    } catch (err: any) {
      console.error('AI error:', err);
      setErrorMessage(err.message || 'Error al traducir el guión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToCurrent = () => {
    if (!generatedResult) return;
    onApplyScript(generatedResult);
    onClose();
  };

  const handleSaveAsNew = () => {
    if (!generatedResult) return;
    const title = topic ? `IA: ${topic.slice(0, 30)}` : 'Nuevo Guión IA';
    onCreateNewScriptWithContent(title, generatedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#121212]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 select-none">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#F9F7F2] border border-[#E0DDD5] rounded-xs shadow-editorial-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#121212]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#F4F1EA] border-b border-[#E0DDD5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#121212] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#F9F7F2]" />
            </div>
            <div>
              <h2 className="text-base font-serif italic font-bold text-[#121212] flex items-center gap-2">
                Asistente de Guiones con Gemini 3.7
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold px-2 py-0.5 rounded-xs bg-white text-[#121212] border border-[#E0DDD5]">
                  SPEECHWRITER ATELIER
                </span>
              </h2>
              <p className="text-xs text-[#666]">
                Genera discursos preparados para teleprompter, optimiza el ritmo y añade pausas escénicas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#666] flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {onOpenDonation && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-mono text-red-800">
              <Heart className="w-3 h-3 fill-current animate-pulse" />
              <span>Lumen Studio es gratuito. Apoya el proyecto con una donación voluntaria.</span>
            </div>
            <button
              onClick={onOpenDonation}
              className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:underline"
            >
              Donar S/ 1+
            </button>
          </div>
        )}

        {/* Tab Selector (Editorial style) */}
        <div className="px-6 pt-3 bg-[#EFECE6] border-b border-[#E0DDD5] flex gap-3">
          <button
            onClick={() => {
              setActiveTab('generate');
              setGeneratedResult('');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-[10px] uppercase tracking-[0.18em] font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'generate'
                ? 'border-[#121212] text-[#121212]'
                : 'border-transparent text-[#666] hover:text-[#121212]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generar Nuevo Guión</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('enhance');
              setGeneratedResult('');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-[10px] uppercase tracking-[0.18em] font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'enhance'
                ? 'border-[#121212] text-[#121212]'
                : 'border-transparent text-[#666] hover:text-[#121212]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Optimizar Guión Actual</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('translate');
              setGeneratedResult('');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-[10px] uppercase tracking-[0.18em] font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'translate'
                ? 'border-[#121212] text-[#121212]'
                : 'border-transparent text-[#666] hover:text-[#121212]'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Traducir Idioma</span>
          </button>
        </div>

        {/* Content Body (2 Columns if result exists) */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-5">
          
          {/* Controls Column */}
          <div className="flex-1 flex flex-col gap-4">
            {activeTab === 'generate' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#121212]">
                    Tema o Puntos Clave del Discurso:
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ejemplo: Presentación del nuevo plan estratégico 2026, destacando la adopción de IA, crecimiento del 40% y agradeciendo al equipo de ingeniería..."
                    rows={3}
                    className="w-full p-3 bg-white text-[#121212] text-xs sm:text-sm rounded-xs border border-[#E0DDD5] focus:border-[#121212] focus:outline-none resize-none shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#121212]">Formato / Audiencia:</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="bg-white text-[#121212] text-xs rounded-xs p-2.5 border border-[#E0DDD5] focus:border-[#121212] focus:outline-none cursor-pointer"
                    >
                      <option value="Keynote / Presentación Principal">Keynote / Conferencia</option>
                      <option value="YouTube Tech Review / Video de Creador">YouTube / Video de Creador</option>
                      <option value="Pitch de Inversores">Pitch de Inversores</option>
                      <option value="Noticiero / Transmisión en Vivo">Noticiero / Transmisión</option>
                      <option value="Discurso Motivacional TEDx">Discurso Motivacional TEDx</option>
                      <option value="Reels / TikTok de 60 Segundos">Reels / Formato Corto</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#121212]">Tono de Voz:</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="bg-white text-[#121212] text-xs rounded-xs p-2.5 border border-[#E0DDD5] focus:border-[#121212] focus:outline-none cursor-pointer"
                    >
                      <option value="Seguro, Inspirador y Claro">Seguro & Inspirador</option>
                      <option value="Dinámico, Cercano y Energético">Dinámico & Cercano</option>
                      <option value="Corporativo, Serio y Preciso">Corporativo & Preciso</option>
                      <option value="Periodístico, Urgente y Formal">Periodístico & Formal</option>
                      <option value="Educativo y Fácil de Seguir">Educativo & Didáctico</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#121212] flex items-center justify-between">
                      <span>Duración Estimada:</span>
                      <span className="text-[#121212] font-mono font-bold">{durationMinutes} min (~{durationMinutes * 135} pal.)</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#121212]">Idioma:</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-white text-[#121212] text-xs rounded-xs p-2.5 border border-[#E0DDD5] focus:border-[#121212] focus:outline-none cursor-pointer"
                    >
                      <option value="Spanish">Español</option>
                      <option value="English">English</option>
                      <option value="Portuguese">Português</option>
                      <option value="French">Français</option>
                      <option value="German">Deutsch</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="mt-2 w-full py-3 px-4 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-editorial transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Escribiendo guión con Gemini 3.7...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 stroke-[2]" />
                      <span>Generar Guión Editorial</span>
                    </>
                  )}
                </button>
              </>
            )}

            {activeTab === 'enhance' && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[#121212]">Selecciona una acción inteligente:</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleEnhance('add_cues')}
                      disabled={isLoading}
                      className="p-3 text-left rounded-xs bg-white hover:bg-[#121212] hover:text-white group border border-[#E0DDD5] transition-all flex flex-col gap-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-[#121212] group-hover:text-white">
                        <Sparkles className="w-3.5 h-3.5 text-[#121212] group-hover:text-white" />
                        <span>Inyectar Cues & Pausas</span>
                      </div>
                      <p className="text-[11px] text-[#666] group-hover:text-[#ccc]">
                        Inserta [PAUSA], [MIRAR CÁMARA] y [ÉNFASIS] en los momentos clave.
                      </p>
                    </button>

                    <button
                      onClick={() => handleEnhance('natural_spoken')}
                      disabled={isLoading}
                      className="p-3 text-left rounded-xs bg-white hover:bg-[#121212] hover:text-white group border border-[#E0DDD5] transition-all flex flex-col gap-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-[#121212] group-hover:text-white">
                        <Wand2 className="w-3.5 h-3.5 text-[#121212] group-hover:text-white" />
                        <span>Hacerlo Más Natural / Spoken</span>
                      </div>
                      <p className="text-[11px] text-[#666] group-hover:text-[#ccc]">
                        Elimina trabalenguas y reformula frases para el oído.
                      </p>
                    </button>

                    <button
                      onClick={() => handleEnhance('shorten')}
                      disabled={isLoading}
                      className="p-3 text-left rounded-xs bg-white hover:bg-[#121212] hover:text-white group border border-[#E0DDD5] transition-all flex flex-col gap-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-[#121212] group-hover:text-white">
                        <Clock className="w-3.5 h-3.5 text-[#121212] group-hover:text-white" />
                        <span>Condensar / Reducir 30%</span>
                      </div>
                      <p className="text-[11px] text-[#666] group-hover:text-[#ccc]">
                        Hace el mensaje más directo y contundente.
                      </p>
                    </button>

                    <button
                      onClick={() => handleEnhance('expand')}
                      disabled={isLoading}
                      className="p-3 text-left rounded-xs bg-white hover:bg-[#121212] hover:text-white group border border-[#E0DDD5] transition-all flex flex-col gap-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs text-[#121212] group-hover:text-white">
                        <Plus className="w-3.5 h-3.5 text-[#121212] group-hover:text-white" />
                        <span>Expandir con Ejemplos</span>
                      </div>
                      <p className="text-[11px] text-[#666] group-hover:text-[#ccc]">
                        Añade storytelling y ejemplos memorables.
                      </p>
                    </button>
                  </div>
                </div>

                {isLoading && (
                  <div className="p-3 bg-white rounded-xs border border-[#E0DDD5] flex items-center justify-center gap-2 text-xs text-[#121212] shadow-2xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#121212]" />
                    <span>Optimizando cadencia y ritmo...</span>
                  </div>
                )}
              </>
            )}

            {activeTab === 'translate' && (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#121212]">Traducir a este idioma:</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="bg-white text-[#121212] text-xs rounded-xs p-2.5 border border-[#E0DDD5] focus:border-[#121212] focus:outline-none cursor-pointer"
                    >
                      <option value="English">Inglés (English)</option>
                      <option value="Spanish">Español</option>
                      <option value="Portuguese">Portugués (Português)</option>
                      <option value="French">Francés (Français)</option>
                      <option value="German">Alemán (Deutsch)</option>
                      <option value="Italian">Italiano</option>
                      <option value="Japanese">Japonés (日本語)</option>
                    </select>
                  </div>

                  <p className="text-xs text-[#666]">
                    La traducción mantendrá intactas todas las etiquetas de dirección del orador como [PAUSA] o [MIRAR A CÁMARA] mientras adapta las expresiones para que suenen naturales en el idioma de destino.
                  </p>

                  <button
                    onClick={handleTranslate}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-editorial transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Traduciendo con IA...</span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-4 h-4" />
                        <span>Traducir Guión Completo</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {errorMessage && (
              <div className="p-3 bg-[#b00020]/10 border border-[#b00020]/30 rounded-xs text-[#b00020] text-xs">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Results Preview Column */}
          <div className="flex-1 flex flex-col gap-2 bg-white p-4 rounded-xs border border-[#E0DDD5] shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E0DDD5] pb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#121212] font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                VISTA PREVIA DEL RESULTADO
              </span>
              {generatedResult && (
                <span className="text-[10px] font-mono text-[#888]">
                  {generatedResult.split(/\s+/).filter(Boolean).length} palabras
                </span>
              )}
            </div>

            <textarea
              readOnly
              value={generatedResult || 'Los resultados generados o mejorados aparecerán aquí...'}
              placeholder="Los resultados generados aparecerán aquí..."
              className="w-full flex-1 min-h-[220px] p-3 bg-transparent text-[#121212] text-xs sm:text-sm font-serif leading-relaxed resize-none focus:outline-none custom-scrollbar"
            />

            {generatedResult && (
              <div className="pt-3 border-t border-[#E0DDD5] flex items-center gap-2">
                <button
                  onClick={handleApplyToCurrent}
                  className="flex-1 py-2.5 px-3 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-editorial transition-all"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Reemplazar en Prompter</span>
                </button>

                <button
                  onClick={handleSaveAsNew}
                  className="py-2.5 px-4 rounded-full bg-white hover:bg-[#121212] text-[#121212] hover:text-white border border-[#E0DDD5] text-xs font-bold uppercase tracking-widest transition-all shadow-2xs"
                >
                  Guardar como Nuevo
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
