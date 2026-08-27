import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiClient } from '../../server/culqiService';

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

    return res.status(200).json({ script: response.text || script });
  } catch (err: any) {
    console.error('enhance-script error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to enhance script' });
  }
}
