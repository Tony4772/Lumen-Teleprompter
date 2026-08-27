import express, {
  type Express,
  type Request,
  type Response as ExpressResponse,
  type NextFunction,
} from 'express';
import { GoogleGenAI } from '@google/genai';

const CULQI_PUBLIC_KEY = process.env.CULQI_PUBLIC_KEY || '';
const CULQI_SECRET_KEY = process.env.CULQI_SECRET_KEY || '';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

async function parseCulqiResponse(response: globalThis.Response): Promise<{
  ok: boolean;
  status: number;
  data: any;
  raw: string;
}> {
  const raw = await response.text();
  try {
    return { ok: response.ok, status: response.status, data: JSON.parse(raw), raw };
  } catch {
    return {
      ok: false,
      status: response.status,
      data: {
        object: 'error',
        user_message:
          'Culqi devolvió una respuesta inválida. Revisa CULQI_SECRET_KEY en Vercel / .env.',
        merchant_message: raw.slice(0, 180),
      },
      raw,
    };
  }
}

function normalizePeruPhone(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  if (digits.length === 11 && digits.startsWith('51')) return digits;
  if (digits.length >= 11) return digits.slice(-11);
  return '51999999999';
}

type AsyncRoute = (
  req: Request,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void>;

function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: ExpressResponse, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Express app with ONLY /api/* routes — used by local server and Vercel. */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      culqiConfigured: Boolean(CULQI_PUBLIC_KEY && CULQI_SECRET_KEY),
      runtime: process.env.VERCEL ? 'vercel' : 'node',
    });
  });

  app.get('/api/culqi/config', (_req, res) => {
    if (!CULQI_PUBLIC_KEY) {
      return res.status(503).json({
        error:
          'Falta CULQI_PUBLIC_KEY. En Vercel: Settings → Environment Variables → agrega CULQI_PUBLIC_KEY y CULQI_SECRET_KEY → Redeploy.',
      });
    }
    res.json({
      publicKey: CULQI_PUBLIC_KEY,
      company: 'EBYZOM E.I.R.L.',
      currency: 'PEN',
      minAmount: 1,
      hasSecret: Boolean(CULQI_SECRET_KEY),
    });
  });

  app.post(
    '/api/culqi/create-order',
    asyncHandler(async (req, res) => {
      if (!CULQI_SECRET_KEY) {
        res.status(503).json({
          error:
            'Falta CULQI_SECRET_KEY en el servidor. Configúrala en Vercel Environment Variables.',
        });
        return;
      }

      const { amount, email, firstName, lastName, phone, message } = req.body || {};
      const parsedAmount = Math.max(1, Number(amount) || 1);
      const amountInCents = Math.round(parsedAmount * 100);
      const orderNumber = `DON${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const orderPayload = {
        amount: amountInCents,
        currency_code: 'PEN',
        description: `Donacion EBYZOM - ${(message || 'Apoyo Lumen').toString().slice(0, 80)}`,
        order_number: orderNumber,
        client_details: {
          first_name: (firstName || 'Donante').trim().slice(0, 50) || 'Donante',
          last_name: (lastName || 'Voluntario').trim().slice(0, 50) || 'Voluntario',
          email: (email || 'donaciones@ebyzom.pe').trim(),
          phone_number: normalizePeruPhone(phone),
        },
        expiration_date: Math.floor(Date.now() / 1000) + 86400,
      };

      const response = await fetch('https://api.culqi.com/v2/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CULQI_SECRET_KEY}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const parsed = await parseCulqiResponse(response);
      const data = parsed.data;

      if (!parsed.ok) {
        console.error('Culqi order error:', parsed.status, data);
        res.status(parsed.status >= 400 ? parsed.status : 502).json({
          error:
            data?.user_message ||
            data?.merchant_message ||
            data?.message ||
            'Error al generar la orden con Culqi',
          details: data,
        });
        return;
      }

      res.json({
        orderId: data.id,
        orderNumber,
        amount: parsedAmount,
        currency: 'PEN',
        qr: data.qr,
        paymentCode: data.payment_code,
      });
    })
  );

  app.post(
    '/api/culqi/charge',
    asyncHandler(async (req, res) => {
      if (!CULQI_SECRET_KEY) {
        res.status(503).json({ error: 'Falta CULQI_SECRET_KEY en el servidor.' });
        return;
      }

      const { tokenId, amount, email, firstName, lastName, message } = req.body || {};
      if (!tokenId) {
        res.status(400).json({ error: 'Token de tarjeta requerido' });
        return;
      }

      const parsedAmount = Math.max(1, Number(amount) || 1);
      const amountInCents = Math.round(parsedAmount * 100);

      const chargePayload = {
        amount: amountInCents,
        currency_code: 'PEN',
        email: (email || 'donaciones@ebyzom.pe').trim(),
        source_id: tokenId,
        description: `Donacion voluntaria EBYZOM - ${(message || 'Lumen').toString().slice(0, 60)}`,
        metadata: {
          donor_name: `${firstName || ''} ${lastName || ''}`.trim(),
          beneficiary: 'EBYZOM E.I.R.L.',
        },
      };

      const response = await fetch('https://api.culqi.com/v2/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CULQI_SECRET_KEY}`,
        },
        body: JSON.stringify(chargePayload),
      });

      const parsed = await parseCulqiResponse(response);
      const data = parsed.data;

      if (!parsed.ok) {
        console.error('Culqi charge error:', parsed.status, data);
        res.status(parsed.status >= 400 ? parsed.status : 502).json({
          error:
            data?.user_message ||
            data?.merchant_message ||
            data?.message ||
            'Error al procesar el cargo con tarjeta',
          details: data,
        });
        return;
      }

      res.json({
        success: true,
        chargeId: data.id,
        amount: parsedAmount,
        currency: 'PEN',
        cardBrand: data.source?.card_brand,
        cardLast4: data.source?.last_four,
        receiptUrl: data.receipt_url,
      });
    })
  );

  app.post(
    '/api/ai/generate-script',
    asyncHandler(async (req, res) => {
      const {
        topic,
        tone = 'Confident & Engaging',
        targetDurationMinutes = 2,
        format = 'Keynote Presentation',
        language = 'Spanish',
      } = req.body || {};

      const ai = getGeminiClient();
      if (!ai) {
        res.status(500).json({ error: 'Gemini API key is not configured.' });
        return;
      }

      const prompt = `You are an elite speechwriter and video producer for top executives and creators.
Write a ready-to-read teleprompter script in ${language}.
Topic: ${topic}
Tone: ${tone}
Format: ${format}
Target Speaking Duration: approximately ${targetDurationMinutes} minute(s) (~${Math.round(targetDurationMinutes * 135)} words at 135 WPM).

Formatting rules for the teleprompter:
1. Break text into natural, digestible short spoken paragraphs (1-3 sentences per paragraph).
2. Insert practical teleprompter cue markers in square brackets, such as:
   - [PAUSA 2s]
   - [MIRAR A CÁMARA]
   - [SONREÍR]
   - [ÉNFASIS]
   - [RESPIRAR PROFUNDO]
3. Write for the ear, not the eye: clear, cadence-driven, conversational yet authoritative.
4. Output ONLY the raw script text without markdown backticks or commentary so the user can immediately paste/load it onto the teleprompter.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      res.json({ script: response.text || '' });
    })
  );

  app.post(
    '/api/ai/enhance-script',
    asyncHandler(async (req, res) => {
      const {
        script,
        action = 'add_cues',
        customInstruction = '',
        language = 'Spanish',
      } = req.body || {};

      const ai = getGeminiClient();
      if (!ai) {
        res.status(500).json({ error: 'Gemini API key is not configured.' });
        return;
      }

      let systemPrompt = '';
      if (action === 'add_cues') {
        systemPrompt = `Analyze the teleprompter script and smartly inject bracketed stage directions/cues for the speaker (e.g. [PAUSA 1s], [PAUSA 2s], [MIRAR FIJAMENTE A CÁMARA], [SONREÍR], [ÉNFASIS: ...], [TONO SOLEMNE], [TRANSCICIÓN SUAVE]). Keep the original wording intact, only formatting and inserting performance cues.`;
      } else if (action === 'natural_spoken') {
        systemPrompt = `Rephrase this script so it sounds 100% natural, energetic, and effortless to speak aloud on camera. Remove tongue-twisters, replace stiff academic jargon with spoken power words, and optimize line lengths for teleprompter breathing rhythm. Preserve key points and meaning.`;
      } else if (action === 'shorten') {
        systemPrompt = `Condense this script by 30-40% into a punchier, high-impact version while keeping the most memorable soundbites and calls to action. Format for teleprompter.`;
      } else if (action === 'expand') {
        systemPrompt = `Elaborate on this script with vivid storytelling, concrete examples, and persuasive rhetorical cadence to make it more engaging and thorough. Format with clean short paragraphs and cues for teleprompter.`;
      } else if (action === 'translate') {
        systemPrompt = `Translate this teleprompter script accurately and naturally into ${language}, preserving all bracketed cue markers like [PAUSA] or [ÉNFASIS].`;
      } else {
        systemPrompt = `Refine this teleprompter script according to this instruction: ${customInstruction}. Maintain teleprompter formatting with short paragraphs and clear rhythm.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `${systemPrompt}\n\nOriginal Script:\n${script}\n\nReturn ONLY the revised script.`,
      });

      res.json({ script: response.text || script });
    })
  );

  app.use((err: any, _req: Request, res: ExpressResponse, _next: NextFunction) => {
    console.error('API error:', err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  });

  return app;
}
