module.exports = async function handler(req, res) {
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let systemPrompt = '';
    if (action === 'add_cues') {
      systemPrompt =
        'Analyze the teleprompter script and smartly inject bracketed stage directions/cues. Keep original wording.';
    } else if (action === 'natural_spoken') {
      systemPrompt =
        'Rephrase this script so it sounds natural to speak aloud. Preserve key points.';
    } else if (action === 'shorten') {
      systemPrompt = 'Condense this script by 30-40%. Format for teleprompter.';
    } else if (action === 'expand') {
      systemPrompt = 'Elaborate on this script with examples. Format for teleprompter.';
    } else if (action === 'translate') {
      systemPrompt = `Translate this teleprompter script into ${language}, preserving cue markers.`;
    } else {
      systemPrompt = `Refine this teleprompter script according to: ${customInstruction}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `${systemPrompt}\n\nOriginal Script:\n${script}\n\nReturn ONLY the revised script.`,
    });

    return res.status(200).json({ script: response.text || script });
  } catch (err) {
    console.error('enhance-script error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to enhance script' });
  }
};
