import { useState, useEffect, useRef, useCallback } from 'react';
import { extractScriptWords, normalizeSpeechToken } from '../utils/prompterUtils';

interface SpeechFollowerOptions {
  enabled: boolean;
  scriptContent: string;
  onMatchProgress?: (ratio: number, matchedWord: string, wordIndex: number) => void;
  onPermissionDenied?: () => void;
}

function tokensMatch(spoken: string, script: string): boolean {
  if (!spoken || !script) return false;
  if (spoken === script) return true;
  if (spoken.length <= 2 || script.length <= 2) return spoken === script;
  if (spoken.includes(script) || script.includes(spoken)) return true;
  const minLen = Math.min(4, Math.min(spoken.length, script.length));
  if (spoken.slice(0, minLen) === script.slice(0, minLen)) return true;
  return false;
}

function isSpeechRecognitionAvailable(): boolean {
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function useSpeechFollower({
  enabled,
  scriptContent,
  onMatchProgress,
  onPermissionDenied,
}: SpeechFollowerOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [recognizedWordsCount, setRecognizedWordsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const scriptWordsRef = useRef<string[]>([]);
  const currentWordPointerRef = useRef(0);
  const enabledRef = useRef(enabled);
  const onMatchProgressRef = useRef(onMatchProgress);
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const intentionalStopRef = useRef(false);
  const restartAttemptsRef = useRef(0);

  enabledRef.current = enabled;
  onMatchProgressRef.current = onMatchProgress;
  onPermissionDeniedRef.current = onPermissionDenied;

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

  const matchSpokenTokens = useCallback(
    (spokenTokens: string[]) => {
      const scriptWords = scriptWordsRef.current;
      if (scriptWords.length === 0 || spokenTokens.length === 0) return;

      let pointer = currentWordPointerRef.current;

      for (const spoken of spokenTokens) {
        const token = normalizeSpeechToken(spoken);
        if (!token) continue;

        const searchEnd = Math.min(scriptWords.length, pointer + 14);
        let matched = false;

        for (let idx = pointer; idx < searchEnd; idx++) {
          if (tokensMatch(token, scriptWords[idx])) {
            pointer = idx + 1;
            reportProgress(idx, scriptWords[idx]);
            matched = true;
            break;
          }
        }

        if (!matched) {
          const lookBack = Math.max(0, pointer - 3);
          for (let idx = lookBack; idx < pointer; idx++) {
            if (tokensMatch(token, scriptWords[idx])) {
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
    intentionalStopRef.current = true;
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

  const failClosed = useCallback((softMessage?: string) => {
    intentionalStopRef.current = true;
    enabledRef.current = false;
    setIsListening(false);
    // Mensaje breve opcional; el UI apaga Voz y no deja banner rojo permanente
    if (softMessage) setError(softMessage);
    else setError(null);
    onPermissionDeniedRef.current?.();
    window.setTimeout(() => setError(null), 2500);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      failClosed('Voz no disponible en este navegador.');
      return;
    }

    intentionalStopRef.current = false;

    if (recognitionRef.current) {
      const prev = recognitionRef.current;
      prev.onend = null;
      prev.onerror = null;
      prev.onresult = null;
      prev.onstart = null;
      try {
        prev.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    // continuous=false es más estable en móvil; reiniciamos en onend
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    recognition.continuous = !isMobile;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      restartAttemptsRef.current = 0;
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error as string;
      console.warn('Speech recognition error:', code);

      // Errores normales / recuperables: no mostrar nada rojo
      if (code === 'no-speech' || code === 'aborted' || code === 'network') {
        return;
      }

      if (code === 'not-allowed' || code === 'service-not-allowed') {
        // Sin banner rojo agresivo: apagar Voz en silencio
        failClosed();
        return;
      }

      if (code === 'audio-capture') {
        // Suele ser conflicto con la grabación; reintentar o apagar suave
        restartAttemptsRef.current += 1;
        if (restartAttemptsRef.current > 2) {
          failClosed();
        }
        return;
      }

      // Otros: no molestar en UI
      console.warn('Speech error ignored in UI:', code);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (intentionalStopRef.current || !enabledRef.current) return;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!enabledRef.current || intentionalStopRef.current) return;
        startListeningRef.current();
      }, isMobile ? 450 : 320);
    };

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const best = result[0]?.transcript || '';
        if (result.isFinal) {
          finalChunk += `${best} `;
        } else {
          interimChunk += best;
        }
      }

      const display = (finalChunk || interimChunk).trim();
      if (display) setLastTranscript(display);

      const finalTokens = finalChunk.trim().split(/\s+/).filter(Boolean);
      if (finalTokens.length > 0) {
        matchSpokenTokens(finalTokens);
      } else if (interimChunk.trim()) {
        const interimTokens = interimChunk.trim().split(/\s+/).filter(Boolean);
        matchSpokenTokens(interimTokens.slice(-3));
      }
    };

    recognitionRef.current = recognition;

    // NO usar getUserMedia aquí: en móvil provoca not-allowed / doble prompt
    try {
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      failClosed();
    }
  }, [matchSpokenTokens, failClosed]);

  startListeningRef.current = startListening;

  const resetVoiceTracking = useCallback(() => {
    currentWordPointerRef.current = 0;
    setRecognizedWordsCount(0);
    setLastTranscript('');
    onMatchProgressRef.current?.(0, '', 0);
  }, []);

  useEffect(() => {
    if (enabled) {
      if (!isSpeechRecognitionAvailable()) {
        failClosed('Voz no disponible en este navegador.');
        return;
      }
      startListening();
    } else {
      stopListening();
      setError(null);
    }
    return () => {
      stopListening();
    };
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
