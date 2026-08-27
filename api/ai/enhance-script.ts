import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient } from '../../Lumen-main/server/culqiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      script,
      action = 'add_cues',
      customInstruction = '',
      language = 'Spanish',
    } = req.body || {};

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    let systemPrompt = '';
    if (action === 'add_cues') {
      systemPrompt = `Inject bracketed teleprompter cues. Keep original wording.`;
    } else if (action === 'natural_spoken') {
      systemPrompt = `Rephrase for natural spoken delivery on camera.`;
    } else if (action === 'shorten') {
      systemPrompt = `Condense by 30-40% keeping key points.`;
    } else if (action === 'expand') {
      systemPrompt = `Elaborate with examples while keeping teleprompter formatting.`;
    } else if (action === 'translate') {
      systemPrompt = `Translate into ${language}, preserving cue markers.`;
    } else {
      systemPrompt = `Refine according to: ${customInstruction}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `${systemPrompt}\n\nOriginal Script:\n${script}\n\nReturn ONLY the revised script.`,
    });

    return res.status(200).json({ script: response.text || script });
  } catch (err: any) {
    console.error('enhance-script error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to enhance script' });
  }
}
