import React from 'react';
import { Keyboard, X, Smartphone, Touchpad } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Espacio', desc: 'Reproducir / Pausar el teleprompter' },
  { key: 'G o Rec', desc: 'Iniciar / Detener y Guardar Grabación de Video' },
  { key: '↑ / ↓', desc: 'Aumentar / Reducir velocidad de desplazamiento' },
  { key: '← / →', desc: 'Retroceder / Avanzar 5 segundos' },
  { key: 'R', desc: 'Reiniciar al inicio del guión' },
  { key: 'M', desc: 'Alternar Modo Espejo Horizontal (Beam Splitter)' },
  { key: 'F', desc: 'Alternar Pantalla Completa' },
  { key: 'C', desc: 'Alternar Cámara Web al lado / flotante' },
  { key: 'V', desc: 'Alternar Seguimiento Inteligente por Voz' },
  { key: '+ / -', desc: 'Aumentar / Disminuir tamaño de fuente' },
  { key: 'Esc', desc: 'Cerrar ventanas modales / Salir de pantalla completa' },
];

const GESTURES = [
  { gesture: '1 Toque', desc: 'Pausar o reanudar el desplazamiento del texto' },
  { gesture: 'Doble Toque', desc: 'Reiniciar el guión al principio con feedback háptico' },
  { gesture: 'Deslizar →', desc: 'Volver rápidamente a la pantalla de Edición de Guión' },
  { gesture: 'Botones A- / A+', desc: 'Escalar el tamaño de la letra sin salir del modo prompter' },
  { gesture: 'Barra Inferior', desc: 'Navegar entre Editor, Prompter, Espejo, Cámara y Biblioteca' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#121212]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[92dvh] bg-[#F9F7F2] border border-[#E0DDD5] rounded-xs shadow-editorial-lg overflow-hidden flex flex-col text-[#121212]">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#F4F1EA] border-b border-[#E0DDD5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#121212] text-white flex items-center justify-center shadow-xs">
              <Keyboard className="w-4 h-4 text-[#F9F7F2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-serif italic font-bold text-[#121212]">
                Atajos de Teclado & Gestos Táctiles
              </h3>
              <p className="text-xs text-[#666]">
                Controla tu teleprompter desde teclado o pantalla táctil
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          
          {/* Mobile Gestures Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <Smartphone className="w-3.5 h-3.5 text-[#121212]" />
              <span>Gestos en Dispositivos Móviles (Teléfonos y Tablets)</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {GESTURES.map((g) => (
                <div
                  key={g.gesture}
                  className="flex items-center justify-between p-2.5 rounded-xs bg-white border border-[#E0DDD5] shadow-2xs text-xs"
                >
                  <span className="text-[#333] font-medium pr-2">{g.desc}</span>
                  <span className="px-2.5 py-1 rounded-xs bg-[#121212] text-white font-mono font-bold text-[10px] shrink-0 uppercase tracking-wider">
                    {g.gesture}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Keyboard Shortcuts Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <Keyboard className="w-3.5 h-3.5 text-[#121212]" />
              <span>Atajos de Teclado Físico</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {SHORTCUTS.map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between p-2.5 rounded-xs bg-white border border-[#E0DDD5] shadow-2xs text-xs"
                >
                  <span className="text-[#333] font-medium pr-2">{sc.desc}</span>
                  <kbd className="px-2.5 py-1 rounded-xs bg-[#F4F1EA] text-[#121212] font-mono font-bold text-[11px] border border-[#D6D2C4] shadow-2xs shrink-0">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-[#F4F1EA] border-t border-[#E0DDD5] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#666] font-mono">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-[#121212]">© EBYZOM E.I.I.R.L.</span>
            <span>• Atajos & Teleprompter Pro</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded-full bg-[#121212] text-white text-[10px] uppercase tracking-widest font-bold hover:bg-[#2a2a2a] w-full sm:w-auto"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
