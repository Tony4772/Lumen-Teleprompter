import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient } from '../../server/culqiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      topic,
      tone = 'Confident & Engaging',
      targetDurationMinutes = 2,
      format = 'Keynote Presentation',
      language = 'Spanish',
    } = req.body || {};

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
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

    return res.status(200).json({ script: response.text || '' });
  } catch (err: any) {
    console.error('generate-script error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate script' });
  }
}
