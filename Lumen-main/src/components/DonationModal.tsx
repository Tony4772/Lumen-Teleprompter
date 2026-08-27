import React, { useState, useEffect } from 'react';
import {
  Heart,
  X,
  CreditCard,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Gift,
  Building2
} from 'lucide-react';

declare global {
  interface Window {
    Culqi?: any;
    culqi?: () => void;
  }
}

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [1, 5, 10, 20, 50, 100];

async function readApiJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.ok
        ? 'El servidor respondió vacío.'
        : 'No hay API de donaciones. Ejecuta la app con npm run dev (puerto 3000), no solo el frontend.'
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 80);
    if (/page could not be found|Cannot GET|Cannot POST|<!DOCTYPE/i.test(text)) {
      throw new Error(
        'No se encontró la API (/api/culqi). Arranca el servidor con npm run dev en Lumen-main (http://localhost:3000).'
      );
    }
    throw new Error(
      `Respuesta inválida del servidor (${res.status}): ${snippet}`
    );
  }
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('10');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [donorMessage, setDonorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    id: string;
    amount: number;
    receiptUrl?: string;
  } | null>(null);

  // Initialize Culqi Script & Listener
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    // Set up global Culqi callback
    window.culqi = async function () {
      const Culqi = window.Culqi;
      if (!Culqi) return;

      if (Culqi.token) {
        // Direct Card Token Charge
        const tokenId = Culqi.token.id;
        try {
          setIsLoading(true);
          const res = await fetch('/api/culqi/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenId,
              amount: currentAmount,
              email: donorEmail || Culqi.token.email,
              firstName: donorName || 'Donante',
              message: donorMessage,
            }),
          });

          const data = await readApiJson(res);
          if (!res.ok) {
            throw new Error(data.error || 'Error al procesar el pago con tarjeta');
          }

          Culqi.close();
          setSuccessData({
            id: data.chargeId || `DON-${Date.now()}`,
            amount: currentAmount,
            receiptUrl: data.receiptUrl,
          });
        } catch (err: any) {
          setErrorMessage(err.message || 'No se pudo completar el cargo.');
        } finally {
          setIsLoading(false);
        }
      } else if (Culqi.order) {
        // Order Payment Completed (e.g. Yape or Mobile Banking)
        Culqi.close();
        setSuccessData({
          id: Culqi.order.id || `DON-${Date.now()}`,
          amount: currentAmount,
        });
        setIsLoading(false);
      } else if (Culqi.error) {
        // User error in modal
        console.error('Culqi error:', Culqi.error);
        setErrorMessage(Culqi.error.user_message || Culqi.error.merchant_message || 'Error en la pasarela Culqi');
        setIsLoading(false);
      }
    };

    return () => {
      window.culqi = undefined;
    };
  }, [isOpen, amount, customAmount, isCustom, donorName, donorEmail, donorMessage]);

  if (!isOpen) return null;

  const currentAmount = isCustom ? Math.max(1, parseFloat(customAmount) || 1) : amount;

  const handleSelectPreset = (val: number) => {
    setIsCustom(false);
    setAmount(val);
    setCustomAmount(val.toString());
    setErrorMessage(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustom(true);
    const val = e.target.value;
    setCustomAmount(val);
    setErrorMessage(null);
  };

  const handleStartCulqiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentAmount < 1) {
      setErrorMessage('La donación mínima es de S/ 1.00 Sol.');
      return;
    }

    try {
      setIsLoading(true);

      // Verify backend API is reachable (local Express or Vercel /api)
      const healthRes = await fetch('/api/health');
      let healthData: any = null;
      try {
        healthData = await readApiJson(healthRes);
      } catch {
        throw new Error(
          'La API de donaciones no está activa en este sitio. En Vercel: Settings → General → Root Directory = "Lumen-main", agrega CULQI_PUBLIC_KEY y CULQI_SECRET_KEY, y haz Redeploy. Luego abre tu-dominio/api/health (debe verse JSON).'
        );
      }
      if (!healthRes.ok) {
        throw new Error(
          healthData?.error ||
            `API health falló (${healthRes.status}). Revisa el deploy en Vercel.`
        );
      }

      const configRes = await fetch('/api/culqi/config');
      const config = await readApiJson(configRes);
      if (!configRes.ok || !config.publicKey) {
        throw new Error(
          config.error ||
            'Culqi no está configurado. Agrega CULQI_PUBLIC_KEY y CULQI_SECRET_KEY en el archivo .env'
        );
      }
      const publicKey = config.publicKey as string;

      if (!window.Culqi) {
        const script = document.createElement('script');
        script.src = 'https://checkout.culqi.com/js/v4';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = () => resolve(null);
          script.onerror = () => reject(new Error('No se pudo cargar el script de Culqi.'));
        });
      }

      if (!window.Culqi) {
        throw new Error('No se pudo inicializar la pasarela de pagos Culqi.');
      }

      const Culqi = window.Culqi;
      Culqi.publicKey = publicKey;

      const orderRes = await fetch('/api/culqi/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentAmount,
          email: donorEmail || 'donante@ebyzom.pe',
          firstName: donorName || 'Donante',
          lastName: 'Lumen',
          phone: donorPhone || '999999999',
          message: donorMessage,
        }),
      });

      const orderData = await readApiJson(orderRes);
      const amountInCents = Math.round(currentAmount * 100);
      const hasOrder = orderRes.ok && Boolean(orderData.orderId);

      if (!hasOrder) {
        console.warn('Culqi order failed, opening card-only checkout:', orderData);
      }

      Culqi.settings({
        title: 'EBYZOM E.I.R.L.',
        currency: 'PEN',
        amount: amountInCents,
        ...(hasOrder ? { order: orderData.orderId } : {}),
      });

      Culqi.options({
        lang: 'es',
        installments: false,
        paymentMethods: {
          tarjeta: true,
          yape: hasOrder,
          billetera: hasOrder,
          bancaMovil: hasOrder,
          agente: hasOrder,
        },
        style: {
          bannerColor: '#121212',
          buttonBackground: '#121212',
          menuColor: '#121212',
          linksColor: '#000000',
          priceColor: '#E63946',
        },
      });

      if (!hasOrder && orderData.error) {
        setErrorMessage(
          `${orderData.error} Se abrirá Culqi solo con tarjeta. Para Yape, revisa tus claves Culqi en .env`
        );
      }

      Culqi.open();
    } catch (err: any) {
      console.error('Error starting Culqi checkout:', err);
      setErrorMessage(err.message || 'Hubo un error al abrir el formulario de pago.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMessage(null);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#F9F7F2] border border-[#D6D2C4] rounded-sm shadow-editorial-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#121212] text-white flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-serif font-bold tracking-tight text-white flex items-center gap-2">
                Donación Voluntaria
                <span className="text-[9px] font-mono font-normal uppercase tracking-widest px-1.5 py-0.5 rounded-xs bg-white/10 text-[#DDD]">
                  Soles (PEN)
                </span>
              </h2>
              <p className="text-[11px] font-mono text-[#AAA] flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#AAA]" />
                Beneficiario: <strong className="text-white">EBYZOM E.I.R.L.</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#DDD] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {successData ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-green-100 border border-green-300 text-green-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-[#121212]">
                  ¡Muchas gracias por tu apoyo!
                </h3>
                <p className="text-xs font-mono text-[#666] max-w-sm mx-auto">
                  Tu donación voluntaria de{' '}
                  <strong className="text-green-700 font-bold">
                    S/ {successData.amount.toFixed(2)} PEN
                  </strong>{' '}
                  ha sido recibida con éxito para <strong>EBYZOM E.I.R.L.</strong>
                </p>
              </div>

              <div className="p-4 bg-white border border-[#E0DDD5] rounded-xs text-left max-w-xs mx-auto space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#888]">
                  <span>Comprobante:</span>
                  <span className="text-[#121212] font-bold">{successData.id.slice(0, 16)}</span>
                </div>
                <div className="flex justify-between text-[#888]">
                  <span>Monto abonado:</span>
                  <span className="text-[#121212] font-bold">S/ {successData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#888]">
                  <span>Estado:</span>
                  <span className="text-green-600 font-bold">Aprobado / Pagado</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#121212] hover:bg-black text-white text-xs font-mono font-bold uppercase tracking-wider transition-all"
                >
                  Regresar al Teleprompter
                </button>
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white hover:bg-[#EFECE6] border border-[#D6D2C4] text-[#121212] text-xs font-mono font-bold transition-all"
                >
                  Hacer otra donación
                </button>
              </div>
            </div>
          ) : (
            /* DONATION FORM */
            <form onSubmit={handleStartCulqiPayment} className="space-y-4">
              {/* Value proposition pill */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xs flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Apoyo libre y voluntario desde S/ 1 Sol</p>
                  <p className="text-[11px] text-amber-800/90 font-mono mt-0.5">
                    Contribuye al mantenimiento de servidores, IA y nuevas funciones de Lumen Studio creadas por <strong>EBYZOM E.I.R.L.</strong>
                  </p>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-[#121212] uppercase tracking-wider">
                  1. Selecciona el monto a donar (Soles PEN)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AMOUNTS.map((val) => {
                    const isSelected = !isCustom && amount === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => handleSelectPreset(val)}
                        className={`py-2 px-1 text-center rounded-xs font-mono text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#121212] text-white border-[#121212] shadow-2xs scale-[1.02]'
                            : 'bg-white hover:bg-[#F4F1EA] text-[#121212] border-[#D6D2C4]'
                        }`}
                      >
                        S/ {val}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#666]">
                      S/
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      placeholder="Otro monto (ej. 15)"
                      value={isCustom ? customAmount : ''}
                      onChange={handleCustomChange}
                      className={`w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white border rounded-xs outline-none transition-colors ${
                        isCustom
                          ? 'border-[#121212] ring-1 ring-[#121212]'
                          : 'border-[#D6D2C4] hover:border-[#121212]'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#888] shrink-0">Mínimo S/ 1.00</span>
                </div>
              </div>

              {/* Donor Contact Fields */}
              <div className="space-y-3 pt-1 border-t border-[#E0DDD5]">
                <label className="block text-xs font-mono font-bold text-[#121212] uppercase tracking-wider">
                  2. Datos del Donante (Opcional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre o Apodo"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D2C4] rounded-xs outline-none focus:border-[#121212]"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Correo (para comprobante)"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D2C4] rounded-xs outline-none focus:border-[#121212]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="tel"
                      placeholder="Teléfono / Celular (Yape)"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D2C4] rounded-xs outline-none focus:border-[#121212]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Mensaje de apoyo (opcional)"
                      value={donorMessage}
                      onChange={(e) => setDonorMessage(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#D6D2C4] rounded-xs outline-none focus:border-[#121212]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods Supported with Badges */}
              <div className="p-3 bg-[#EFECE6] border border-[#D6D2C4] rounded-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#555]">
                  <span className="font-bold text-[#121212] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                    Pasarela Oficial Culqi
                  </span>
                  <span>Pagos 100% Seguros</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-[#333]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-purple-100 text-purple-900 border border-purple-300 font-bold">
                    <Smartphone className="w-3 h-3" /> Yape
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-blue-100 text-blue-900 border border-blue-300 font-bold">
                    <CreditCard className="w-3 h-3" /> Tarjetas Débito / Crédito
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                    Visa • Mastercard • Amex • Diners
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xs flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit / Open Culqi Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || currentAmount < 1}
                  className="w-full py-3.5 px-6 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-[#AAA] text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-editorial transition-all active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando con Culqi...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-current text-white animate-pulse" />
                      <span>
                        Pagar Donación de S/ {currentAmount.toFixed(2)} con Culqi
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[10px] font-mono text-center text-[#888] mt-2">
                  Se abrirá el formulario seguro de Culqi para pagar vía <strong>Yape</strong> o <strong>Tarjeta</strong>.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F4F1EA] border-t border-[#E0DDD5] flex items-center justify-between text-[11px] font-mono text-[#666]">
          <span>© EBYZOM E.I.R.L.</span>
          <span className="text-[#888]">RUC / Registro Comercial Perú</span>
        </div>
      </div>
    </div>
  );
};
