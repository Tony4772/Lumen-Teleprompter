import React from 'react';
import { 
  Settings, 
  X, 
  Type, 
  Palette, 
  Sliders, 
  FlipHorizontal, 
  Camera, 
  Eye, 
  Clock, 
  Tv, 
  Check,
  Columns,
  Grid,
  ArrowLeftRight,
  Heart,
  BookOpen
} from 'lucide-react';
import { PrompterSettings, ReaderLineStyle, CameraLayout, CameraPosition } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrompterSettings;
  onUpdateSettings: (newSettings: Partial<PrompterSettings>) => void;
  onOpenDonation?: () => void;
  onOpenManual?: () => void;
}

const COLOR_PRESETS = [
  { name: 'Editorial Ink / Papel', textColor: '#121212', bgColor: '#F9F7F2' },
  { name: 'Blanco Puro / Obsidian', textColor: '#ffffff', bgColor: '#000000' },
  { name: 'Crema Calma / Carbón', textColor: '#F9F7F2', bgColor: '#121212' },
  { name: 'Ámbar Cálido / Obsidian', textColor: '#ffd59c', bgColor: '#000000' },
  { name: 'Gris Suizo / Lino', textColor: '#222222', bgColor: '#EFECE6' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenDonation,
  onOpenManual,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#121212]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 select-none">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#F9F7F2] border border-[#E0DDD5] rounded-xs shadow-editorial-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#121212]">
        
        {/* Modal Header (Editorial Masthead) */}
        <div className="px-6 py-4 bg-[#F4F1EA] border-b border-[#E0DDD5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#121212] flex items-center justify-center">
              <Settings className="w-4 h-4 text-[#121212]" />
            </div>
            <div>
              <h2 className="text-base font-serif italic font-bold text-[#121212]">Configuración de Teleprompter</h2>
              <p className="text-xs text-[#666]">Calibra óptica, márgenes editoriales y visualización</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#121212] hover:text-white border border-[#E0DDD5] text-[#666] flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Section 1: Typography */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <Type className="w-3.5 h-3.5 text-[#121212]" />
              <span>Tipografía y Proporción</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xs border border-[#E0DDD5] shadow-2xs">
              {/* Font Family */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#121212] font-semibold">Familia Tipográfica:</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => onUpdateSettings({ fontFamily: e.target.value as any })}
                  className="bg-[#F9F7F2] text-[#121212] text-xs rounded-xs p-2 border border-[#E0DDD5] focus:border-[#121212] focus:outline-none cursor-pointer"
                >
                  <option value="Serif">Playfair / Cormorant (Editorial Clásico)</option>
                  <option value="Inter">Inter (Grotesque Suizo - Máxima Legibilidad)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Técnico / Broadcast)</option>
                </select>
              </div>

              {/* Line Height */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#121212] font-semibold flex justify-between">
                  <span>Interlineado:</span>
                  <span className="text-[#121212] font-mono font-bold">{settings.lineHeight}x</span>
                </label>
                <input
                  type="range"
                  min="1.1"
                  max="2.2"
                  step="0.05"
                  value={settings.lineHeight}
                  onChange={(e) => onUpdateSettings({ lineHeight: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
                />
              </div>

              {/* Safe Margin (Keep eyes centered) */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-[#121212] font-semibold flex justify-between">
                  <span>Margen de Seguridad Lateral (Mantiene mirada centrada):</span>
                  <span className="text-[#121212] font-mono font-bold">{settings.safeMargin}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={settings.safeMargin}
                  onChange={(e) => onUpdateSettings({ safeMargin: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
                />
                <span className="text-[11px] text-[#666]">
                  Mantener entre 15% y 25% hace que tu mirada se mantenga clavada en el centro del lente de la cámara.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Colors & Contrast */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <Palette className="w-3.5 h-3.5 text-[#121212]" />
              <span>Contraste y Paleta de Colores</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected =
                  settings.textColor === preset.textColor &&
                  settings.bgColor === preset.bgColor;

                return (
                  <button
                    key={preset.name}
                    onClick={() =>
                      onUpdateSettings({
                        textColor: preset.textColor,
                        bgColor: preset.bgColor,
                      })
                    }
                    className={`p-3 rounded-xs border text-left transition-all flex flex-col gap-2 shadow-2xs ${
                      isSelected
                        ? 'border-[#121212] bg-[#EFECE6]'
                        : 'border-[#E0DDD5] bg-white hover:border-[#121212]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded-full border border-[#121212]/30"
                          style={{ backgroundColor: preset.bgColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-[#121212]/30"
                          style={{ backgroundColor: preset.textColor }}
                        />
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#121212]" />}
                    </div>
                    <span className="text-xs font-serif italic font-semibold text-[#121212] truncate">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Reader Line & Visual Focus */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <Eye className="w-3.5 h-3.5 text-[#121212]" />
              <span>Línea Guía de Lectura</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xs border border-[#E0DDD5] shadow-2xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#121212] font-semibold">Estilo de Línea Guía:</label>
                <select
                  value={settings.readerLineStyle}
                  onChange={(e) =>
                    onUpdateSettings({ readerLineStyle: e.target.value as ReaderLineStyle })
                  }
                  className="bg-[#F9F7F2] text-[#121212] text-xs rounded-xs p-2 border border-[#E0DDD5] focus:border-[#121212] focus:outline-none cursor-pointer"
                >
                  <option value="bar">Barra Continua de Precisión</option>
                  <option value="glow">Banda Suave Resaltada</option>
                  <option value="arrows">Flechas Laterales</option>
                  <option value="none">Ocultar Línea Guía</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#121212] font-semibold flex justify-between">
                  <span>Posición Vertical:</span>
                  <span className="text-[#121212] font-mono font-bold">{settings.readerLinePosition}%</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="70"
                  step="2"
                  value={settings.readerLinePosition}
                  onChange={(e) =>
                    onUpdateSettings({ readerLinePosition: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
                />
              </div>

              {/* Focus Dim Toggle */}
              <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-[#E0DDD5]">
                <div>
                  <span className="text-xs text-[#121212] font-semibold">Modo Foco (Atenuar texto periférico)</span>
                  <p className="text-[11px] text-[#666]">
                    Atenúa suavemente las líneas que no están cerca del puntero de lectura actual.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.focusDim}
                  onChange={(e) => onUpdateSettings({ focusDim: e.target.checked })}
                  className="w-4 h-4 rounded-xs accent-[#121212] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Hardware Mirroring & Inversion */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <FlipHorizontal className="w-3.5 h-3.5 text-[#121212]" />
              <span>Modo Espejo y Hardware</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ mirrorX: !settings.mirrorX })}
                className={`p-3 rounded-xs border text-left flex items-center justify-between shadow-2xs ${
                  settings.mirrorX
                    ? 'border-[#121212] bg-[#EFECE6]'
                    : 'border-[#E0DDD5] bg-white'
                }`}
              >
                <div>
                  <span className="text-xs text-[#121212] font-semibold block">Reflejo Horizontal (X)</span>
                  <span className="text-[11px] text-[#666]">Para cristal teleprompter divisor</span>
                </div>
                <span className={`text-xs font-mono font-bold ${settings.mirrorX ? 'text-[#121212]' : 'text-[#999]'}`}>
                  {settings.mirrorX ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </button>

              <button
                onClick={() => onUpdateSettings({ mirrorY: !settings.mirrorY })}
                className={`p-3 rounded-xs border text-left flex items-center justify-between shadow-2xs ${
                  settings.mirrorY
                    ? 'border-[#121212] bg-[#EFECE6]'
                    : 'border-[#E0DDD5] bg-white'
                }`}
              >
                <div>
                  <span className="text-xs text-[#121212] font-semibold block">Inversión Vertical (Y)</span>
                  <span className="text-[11px] text-[#666]">Para montajes invertidos</span>
                </div>
                <span className={`text-xs font-mono font-bold ${settings.mirrorY ? 'text-[#121212]' : 'text-[#999]'}`}>
                  {settings.mirrorY ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 5: Webcam Integration Settings */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#666]">
              <Camera className="w-3.5 h-3.5 text-[#121212]" />
              <span>Cámara Web y Vista en Vivo</span>
            </div>

            <div className="bg-white p-4 rounded-xs border border-[#E0DDD5] flex flex-col gap-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#121212] font-semibold">Activar Cámara Web de la Laptop</span>
                  <p className="text-[11px] text-[#666]">
                    Muestra tu imagen en vivo junto al teleprómpter para verte mientras lees.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cameraOverlay}
                  onChange={(e) => onUpdateSettings({ cameraOverlay: e.target.checked })}
                  className="w-4 h-4 rounded-xs accent-[#121212] cursor-pointer"
                />
              </div>

              {settings.cameraOverlay && (
                <div className="flex flex-col gap-3 pt-3 border-t border-[#E0DDD5]">
                  {/* Layout Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#121212] font-semibold">Disposición de la Cámara:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onUpdateSettings({ cameraLayout: 'side-by-side' })}
                        className={`p-2.5 rounded-xs border text-left flex flex-col gap-1 transition-all ${
                          settings.cameraLayout === 'side-by-side' || !settings.cameraLayout
                            ? 'border-[#121212] bg-[#EFECE6]'
                            : 'border-[#E0DDD5] bg-white hover:bg-[#F9F7F2]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#121212]">
                          <Columns className="w-3.5 h-3.5" />
                          <span>Al Lado (Split)</span>
                        </div>
                        <span className="text-[10px] text-[#666] leading-tight">
                          Mitad cámara, mitad texto (Recomendado)
                        </span>
                      </button>

                      <button
                        onClick={() => onUpdateSettings({ cameraLayout: 'pip' })}
                        className={`p-2.5 rounded-xs border text-left flex flex-col gap-1 transition-all ${
                          settings.cameraLayout === 'pip'
                            ? 'border-[#121212] bg-[#EFECE6]'
                            : 'border-[#E0DDD5] bg-white hover:bg-[#F9F7F2]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#121212]">
                          <Tv className="w-3.5 h-3.5" />
                          <span>Flotante (PiP)</span>
                        </div>
                        <span className="text-[10px] text-[#666] leading-tight">
                          Cuadro flotante en la esquina
                        </span>
                      </button>

                      <button
                        onClick={() => onUpdateSettings({ cameraLayout: 'background' })}
                        className={`p-2.5 rounded-xs border text-left flex flex-col gap-1 transition-all ${
                          settings.cameraLayout === 'background'
                            ? 'border-[#121212] bg-[#EFECE6]'
                            : 'border-[#E0DDD5] bg-white hover:bg-[#F9F7F2]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#121212]">
                          <Palette className="w-3.5 h-3.5" />
                          <span>Fondo</span>
                        </div>
                        <span className="text-[10px] text-[#666] leading-tight">
                          Translúcido detrás del texto
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Position selector for side-by-side */}
                  {(settings.cameraLayout === 'side-by-side' || !settings.cameraLayout) && (
                    <div className="flex flex-col gap-1.5 pt-2">
                      <label className="text-xs text-[#121212] font-semibold">Posición de la Cámara:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onUpdateSettings({ cameraPosition: 'left' })}
                          className={`p-2 rounded-xs border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            settings.cameraPosition === 'left' || !settings.cameraPosition
                              ? 'border-[#121212] bg-[#EFECE6] text-[#121212]'
                              : 'border-[#E0DDD5] bg-white text-[#666]'
                          }`}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Cámara a la Izquierda</span>
                        </button>
                        <button
                          onClick={() => onUpdateSettings({ cameraPosition: 'right' })}
                          className={`p-2 rounded-xs border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            settings.cameraPosition === 'right'
                              ? 'border-[#121212] bg-[#EFECE6] text-[#121212]'
                              : 'border-[#E0DDD5] bg-white text-[#666]'
                          }`}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Cámara a la Derecha</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Extra Camera Toggles: Mirror & Framing Guides */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => onUpdateSettings({ cameraMirror: !(settings.cameraMirror !== false) })}
                      className={`p-2.5 rounded-xs border text-left flex items-center justify-between transition-colors ${
                        settings.cameraMirror !== false
                          ? 'border-[#121212] bg-[#EFECE6]'
                          : 'border-[#E0DDD5] bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs text-[#121212] font-semibold block">Efecto Espejo</span>
                        <span className="text-[10px] text-[#666]">Reflejo natural de la cámara</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${settings.cameraMirror !== false ? 'text-[#121212]' : 'text-[#999]'}`}>
                        {settings.cameraMirror !== false ? 'SÍ' : 'NO'}
                      </span>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ cameraFramingGuides: !settings.cameraFramingGuides })}
                      className={`p-2.5 rounded-xs border text-left flex items-center justify-between transition-colors ${
                        settings.cameraFramingGuides
                          ? 'border-[#121212] bg-[#EFECE6]'
                          : 'border-[#E0DDD5] bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs text-[#121212] font-semibold block">Guías de Encuadre</span>
                        <span className="text-[10px] text-[#666]">Línea de contacto visual</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${settings.cameraFramingGuides ? 'text-[#121212]' : 'text-[#999]'}`}>
                        {settings.cameraFramingGuides ? 'SÍ' : 'NO'}
                      </span>
                    </button>
                  </div>

                  {settings.cameraLayout === 'background' && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E0DDD5]">
                      <label className="text-xs text-[#121212] font-semibold flex justify-between">
                        <span>Opacidad de Cámara de Fondo:</span>
                        <span className="text-[#121212] font-mono font-bold">{Math.round(settings.cameraOpacity * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={settings.cameraOpacity}
                        onChange={(e) => onUpdateSettings({ cameraOpacity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-[#D6D2C4] rounded-xs appearance-none cursor-pointer accent-[#121212]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Voluntary Donation to EBYZOM E.I.R.L. */}
          {onOpenDonation && (
            <div className="p-4 rounded-xs border border-red-200 bg-red-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Heart className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#121212] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    Donaciones Voluntarias
                    <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded-xs font-bold font-mono">
                      Culqi • Yape • Tarjetas
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#555] font-mono mt-0.5">
                    Apoya el desarrollo de Lumen Teleprompter Studio (propiedad de <strong>EBYZOM E.I.R.L.</strong>) desde S/ 1.00 Sol.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenDonation();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-editorial shrink-0 active:scale-95 transition-all"
              >
                <Heart className="w-3.5 h-3.5 fill-current text-white" />
                <span>Donar desde S/ 1</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F4F1EA] border-t border-[#E0DDD5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-[11px] font-mono text-[#666] text-center sm:text-left">
              <span className="font-bold text-[#121212]">© EBYZOM E.I.R.L.</span>
              <span className="mx-1.5">•</span>
              <span>v1.0.0</span>
            </div>

            {onOpenManual && (
              <button
                onClick={onOpenManual}
                className="flex items-center gap-1 text-[11px] font-bold text-[#121212] hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manual de Uso</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-full bg-[#121212] hover:bg-[#2a2a2a] text-white font-bold text-xs uppercase tracking-widest shadow-2xs transition-all w-full sm:w-auto"
          >
            Listo / Guardar
          </button>
        </div>

      </div>
    </div>
  );
};
