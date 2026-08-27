export function countWords(text: string): number {
  if (!text) return 0;
  // Exclude bracketed cue markers from word count so timing is accurate
  const cleanText = text.replace(/\[.*?\]/g, ' ');
  const words = cleanText.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/** Same tokenization as voice follower — keeps scroll index aligned with ASR. */
export function normalizeSpeechToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\wñ]/gi, '')
    .trim();
}

export function extractScriptWords(content: string): string[] {
  const clean = content
    .replace(/\[.*?\]/g, ' ')
    .replace(/#+\s*/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'¡¿…]/g, ' ');
  return clean
    .split(/\s+/)
    .map(normalizeSpeechToken)
    .filter((w) => w.length > 0);
}

export function countLineScriptWords(text: string): number {
  return extractScriptWords(text || '').length;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function estimateDurationSeconds(wordCount: number, wpm: number): number {
  if (wpm <= 0 || wordCount <= 0) return 0;
  return Math.round((wordCount / wpm) * 60);
}

export interface ParsedLine {
  id: string;
  type: 'speech' | 'cue' | 'heading';
  raw: string;
  cleanText: string;
  cueText?: string;
  isEmphasis?: boolean;
}

export function parseScriptContent(content: string): ParsedLine[] {
  if (!content) return [];
  const lines = content.split('\n');
  
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return {
        id: `line-${index}`,
        type: 'speech',
        raw: '',
        cleanText: '',
      };
    }

    // Check if whole line is a cue marker like [PAUSA 2s]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const cueInner = trimmed.slice(1, -1);
      return {
        id: `line-${index}`,
        type: 'cue',
        raw: line,
        cleanText: '',
        cueText: cueInner,
      };
    }

    // Heading style like # or **
    if (trimmed.startsWith('#')) {
      return {
        id: `line-${index}`,
        type: 'heading',
        raw: line,
        cleanText: trimmed.replace(/^#+\s*/, ''),
      };
    }

    return {
      id: `line-${index}`,
      type: 'speech',
      raw: line,
      cleanText: line,
    };
  });
}
