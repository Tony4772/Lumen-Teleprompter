import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechFollowerOptions {
  enabled: boolean;
  scriptContent: string;
  onMatchProgress?: (ratio: number, matchedWord: string, wordIndex: number) => void;
}

/** Normalize for Spanish speech matching (accents, punctuation). */
function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\wñ]/gi, '')
    .trim();
}

function tokensMatch(spoken: string, script: string): boolean {
  if (!spoken || !script) return false;
  if (spoken === script) return true;
  // Short words: exact only (avoid false positives like "a"/"al")
  if (spoken.length <= 2 || script.length <= 2) return spoken === script;
  if (spoken.includes(script) || script.includes(spoken)) return true;
  // Prefix match for conjugated / truncated ASR results
  const minLen = Math.min(4, Math.min(spoken.length, script.length));
  if (spoken.slice(0, minLen) === script.slice(0, minLen)) return true;
  return false;
}

function extractScriptWords(content: string): string[] {
  const clean = content
    .replace(/\[.*?\]/g, ' ')
    .replace(/#+\s*/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'¡¿…]/g, ' ');
  return clean
    .split(/\s+/)
    .map(normalizeToken)
    .filter((w) => w.length > 0);
}

export function useSpeechFollower({ enabled, scriptContent, onMatchProgress }: SpeechFollowerOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [recognizedWordsCount, setRecognizedWordsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const scriptWordsRef = useRef<string[]>([]);
  const currentWordPointerRef = useRef(0);
  const enabledRef = useRef(enabled);
  const onMatchProgressRef = useRef(onMatchProgress);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  enabledRef.current = enabled;
  onMatchProgressRef.current = onMatchProgress;

  useEffect(() => {
    scriptWordsRef.current = extractScriptWords(scriptContent);
    currentWordPointerRef.current = 0;
    setRecognizedWordsCount(0);
  }, [scriptContent]);

  const reportProgress = useCallback((idx: number, word: string) => {
    currentWordPointerRef.current = idx;
    setRecognizedWordsCount(idx + 1);
    const total = scriptWordsRef.current.length;
    const ratio = total <= 1 ? 0 : idx / (total - 1);
    onMatchProgressRef.current?.(ratio, word, idx);
  }, []);

  /** Advance pointer using newly heard tokens (final + interim). */
  const matchSpokenTokens = useCallback(
    (spokenTokens: string[]) => {
      const scriptWords = scriptWordsRef.current;
      if (scriptWords.length === 0 || spokenTokens.length === 0) return;

      let pointer = currentWordPointerRef.current;

      for (const spoken of spokenTokens) {
        const token = normalizeToken(spoken);
        if (!token) continue;

        // Look ahead from current position (skip missed filler words)
        const searchEnd = Math.min(scriptWords.length, pointer + 12);
        let matched = false;

        for (let idx = pointer; idx < searchEnd; idx++) {
          if (tokensMatch(token, scriptWords[idx])) {
            pointer = idx + 1;
            reportProgress(idx, scriptWords[idx]);
            matched = true;
            break;
          }
        }

        // If no forward match, try a small look-back (ASR corrections)
        if (!matched) {
          const lookBack = Math.max(0, pointer - 3);
          for (let idx = lookBack; idx < pointer; idx++) {
            if (tokensMatch(token, scriptWords[idx])) {
              // Don't move backward; ignore already-matched echoes
              matched = true;
              break;
            }
          }
        }
      }
    },
    [reportProgress]
  );

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('El reconocimiento de voz no está disponible. Usa Chrome o Edge.');
      return;
    }

    // Tear down any previous instance without flipping enabledRef
    if (recognitionRef.current) {
      const prev = recognitionRef.current;
      prev.onend = null;
      try {
        prev.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error as string;
      console.warn('Speech recognition error:', code);
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Permiso de micrófono denegado. Actívalo en el navegador.');
        enabledRef.current = false;
        setIsListening(false);
        return;
      }
      if (code === 'audio-capture') {
        setError('No se encontró un micrófono.');
        return;
      }
      // no-speech / aborted / network — allow auto-restart via onend
      if (code !== 'no-speech' && code !== 'aborted') {
        setError(`Error de voz: ${code}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!enabledRef.current) return;
      // Chrome stops continuous recognition periodically; restart gently
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!enabledRef.current || !recognitionRef.current) return;
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Could not restart speech recognition', e);
        }
      }, 280);
    };

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalChunk += `${piece} `;
        } else {
          interimChunk += piece;
        }
      }

      const display = (finalChunk || interimChunk).trim();
      if (display) setLastTranscript(display);

      // Prefer final tokens for advancing; also use interim last words for snappiness
      const finalTokens = finalChunk.trim().split(/\s+/).filter(Boolean);
      if (finalTokens.length > 0) {
        matchSpokenTokens(finalTokens);
      } else if (interimChunk.trim()) {
        const interimTokens = interimChunk.trim().split(/\s+/).filter(Boolean);
        // Only try the last 1–2 interim words to avoid jumping ahead
        matchSpokenTokens(interimTokens.slice(-2));
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('No se pudo iniciar el micrófono');
    }
  }, [matchSpokenTokens]);

  const resetVoiceTracking = useCallback(() => {
    currentWordPointerRef.current = 0;
    setRecognizedWordsCount(0);
    setLastTranscript('');
    onMatchProgressRef.current?.(0, '', 0);
  }, []);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
      setError(null);
    }
    return () => {
      stopListening();
    };
    // Intentionally only depend on `enabled` — startListening/stopListening are stable enough
    // via refs; re-creating recognition on every callback change was killing tracking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    isListening,
    lastTranscript,
    recognizedWordsCount,
    totalWordsCount: scriptWordsRef.current.length,
    error,
    resetVoiceTracking,
  };
}
