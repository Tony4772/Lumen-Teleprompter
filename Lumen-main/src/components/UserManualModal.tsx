import React from 'react';
import {
  BookOpen,
  X,
  Edit3,
  Sparkles,
  Tv,
  Video,
  Settings,
  Mic,
  Keyboard,
  Heart,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'Editor de Guiones (Atelier)',
      icon: <Edit3 className="w-4 h-4" />,
      content: 'Crea, organiza e importa documentos (.pdf, .docx, .txt). Usa CUES como [PAUSA] para marcar el ritmo de tu lectura.'
    },
    {
      title: 'Asistente de IA Gemini 3.7',
      icon: <Sparkles className="w-4 h-4" />,
      content: 'Genera discursos desde cero, optimiza el lenguaje para que suene natural o traduce manteniendo tus etiquetas escénicas.'
    },
    {
      title: 'Modos Pro y Espejo',
      icon: <Tv className="w-4 h-4" />,
      content: 'Alterna entre vista dividida, pantalla completa o modo espejo para usar con hardware de teleprompter profesional.'
    },
    {
      title: 'Grabación de Video HD',
      icon: <Video className="w-4 h-4" />,
      content: 'Graba tus tomas directamente. En móvil, puedes arrastrar la cámara flotante con el dedo para no tapar el texto.'
    },
    {
      title: 'Seguimiento por Voz',
      icon: <Mic className="w-4 h-4" />,
      content: 'Activa el micrófono para que el texto se desplace automáticamente a la velocidad de tu voz.'
    },
    {
      title: 'Control por Atajos',
      icon: <Keyboard className="w-4 h-4" />,
      content: 'Usa Espacio para pausar, flechas para velocidad y doble toque en móvil para reiniciar el guión.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-[#121212]/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] bg-[#F9F7F2] border border-[#D6D2C4] rounded-xs shadow-editorial-lg flex flex-col overflow-hidden text-[#121212]">

        {/* Header */}
        <div className="px-6 py-4 bg-[#F4F1EA] border-b border-[#E0DDD5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#121212] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4 text-[#F9F7F2]" />
            </div>
            <div>
              <h2 className="text-base font-serif italic font-bold text-[#121212]">Guía de Uso Lumen Studio</h2>
              <p className="text-[11px] text-[#666] uppercase tracking-widest font-mono">Manual de Usuario Oficial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#666] flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 sm:p-8 overflow-y-auto custom-scrollbar bg-white">
          <div className="max-w-2xl mx-auto space-y-8">

            {/* Hero Intro */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold italic tracking-tight">Potencia tu comunicación</h1>
              <p className="text-sm text-[#555] leading-relaxed">
                Lumen es una herramienta diseñada para que nunca pierdas el contacto visual con tu audiencia, ya sea grabando un video corto o dando una conferencia magistral.
              </p>
            </div>

            {/* Grid Sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sections.map((s, i) => (
                <div key={i} className="p-4 rounded-xs border border-[#E0DDD5] bg-[#F9F7F2]/50 space-y-2 hover:border-[#121212] transition-colors group">
                  <div className="flex items-center gap-2 text-[#121212]">
                    <div className="p-1.5 rounded-full bg-[#121212] text-white group-hover:scale-110 transition-transform">
                      {s.icon}
                    </div>
                    <span className="font-serif font-bold italic text-sm">{s.title}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#666]">
                    {s.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Support section */}
            <div className="p-5 rounded-xs bg-red-50 border border-red-100 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Heart className="w-6 h-6 fill-current animate-pulse" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-red-900">¿Te gusta Lumen Studio?</h4>
                <p className="text-[11px] text-red-800/80 font-mono">
                  Somos un proyecto gratuito. Si te ha servido, considera realizar una donación voluntaria para ayudarnos con los costos de servidores e IA.
                </p>
              </div>
              <button className="px-5 py-2 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-md">
                Donar S/ 1
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F4F1EA] border-t border-[#E0DDD5] flex items-center justify-between text-[10px] font-mono text-[#888]">
          <span>Lumen Teleprompter Studio • v1.0.0</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">© EBYZOM E.I.R.L.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
