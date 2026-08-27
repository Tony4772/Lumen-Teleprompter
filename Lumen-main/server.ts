import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const CULQI_PUBLIC_KEY = process.env.CULQI_PUBLIC_KEY || 'pk_live_U6Rxa1sMaLcZKpcA';
const CULQI_SECRET_KEY = process.env.CULQI_SECRET_KEY || 'sk_live_5Sc2O9AqIvnvJTqm';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Culqi Public Config Endpoint
  app.get('/api/culqi/config', (req, res) => {
    res.json({
      publicKey: CULQI_PUBLIC_KEY,
      company: 'EBYZOM E.I.I.R.L.',
      currency: 'PEN',
      minAmount: 1, // 1 Sol
    });
  });

  // Culqi Create Order (for Yape, QR, Tarjetas, Billeteras)
  app.post('/api/culqi/create-order', async (req, res) => {
    try {
      const { amount, email, firstName, lastName, phone, message } = req.body;
      const parsedAmount = Math.max(1, Number(amount) || 1);
      const amountInCents = Math.round(parsedAmount * 100);
      const orderNumber = `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const orderPayload = {
        amount: amountInCents,
        currency_code: 'PEN',
        description: `Donación a EBYZOM E.I.I.R.L. - ${message || 'Apoyo al proyecto'}`,
        order_number: orderNumber,
        client_details: {
          first_name: (firstName || 'Donante').trim().slice(0, 50),
          last_name: (lastName || 'Voluntario').trim().slice(0, 50),
          email: (email || 'donaciones@ebyzom.pe').trim(),
          phone_number: (phone || '999999999').trim(),
        },
        expiration_date: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        confirm: false,
      };

      const response = await fetch('https://api.culqi.com/v2/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CULQI_SECRET_KEY}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error('Culqi order error:', data);
        return res.status(response.status).json({
          error: data.user_message || data.merchant_message || 'Error al generar la orden con Culqi',
          details: data,
        });
      }

      res.json({
        orderId: data.id,
        orderNumber,
        amount: parsedAmount,
        currency: 'PEN',
        qr: data.qr,
        paymentCode: data.payment_code,
      });
    } catch (err: any) {
      console.error('Error in /api/culqi/create-order:', err);
      res.status(500).json({ error: err.message || 'Error interno al procesar donación' });
    }
  });

  // Culqi Charge Token (for credit/debit card token payments)
  app.post('/api/culqi/charge', async (req, res) => {
    try {
      const { tokenId, amount, email, firstName, lastName, message } = req.body;
      if (!tokenId) {
        return res.status(400).json({ error: 'Token de tarjeta requerido' });
      }

      const parsedAmount = Math.max(1, Number(amount) || 1);
      const amountInCents = Math.round(parsedAmount * 100);

      const chargePayload = {
        amount: amountInCents,
        currency_code: 'PEN',
        email: (email || 'donaciones@ebyzom.pe').trim(),
        source_id: tokenId,
        description: `Donación voluntaria a EBYZOM E.I.I.R.L. - ${message || 'Lumen Teleprompter'}`,
        metadata: {
          donor_name: `${firstName || ''} ${lastName || ''}`.trim(),
          beneficiary: 'EBYZOM E.I.I.R.L.',
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

      const data: any = await response.json();

      if (!response.ok) {
        console.error('Culqi charge error:', data);
        return res.status(response.status).json({
          error: data.user_message || data.merchant_message || 'Error al procesar el cargo con tarjeta',
          details: data,
        });
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
    } catch (err: any) {
      console.error('Error in /api/culqi/charge:', err);
      res.status(500).json({ error: err.message || 'Error interno al cobrar donación' });
    }
  });

  // AI Script Generation
  app.post('/api/ai/generate-script', async (req, res) => {
    try {
      const { topic, tone = 'Confident & Engaging', targetDurationMinutes = 2, format = 'Keynote Presentation', language = 'Spanish' } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({
          error: 'Gemini API key is not configured.',
        });
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

      const scriptText = response.text || '';
      res.json({ script: scriptText });
    } catch (err: any) {
      console.error('Error generating script:', err);
      res.status(500).json({ error: err.message || 'Failed to generate script' });
    }
  });

  // AI Script Enhancement / Pacing / Cues
  app.post('/api/ai/enhance-script', async (req, res) => {
    try {
      const { script, action = 'add_cues', customInstruction = '', language = 'Spanish' } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({
          error: 'Gemini API key is not configured.',
        });
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
    } catch (err: any) {
      console.error('Error enhancing script:', err);
      res.status(500).json({ error: err.message || 'Failed to enhance script' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumen Prompt server running on http://localhost:${PORT}`);
  });
}

startServer();
