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

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('El reconocimiento de voz no está disponible. Usa Chrome o Edge.');
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-PE';
    recognition.maxAlternatives = 3;

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
        onPermissionDeniedRef.current?.();
        return;
      }
      if (code === 'audio-capture') {
        setError('No se encontró un micrófono.');
        return;
      }
      if (code !== 'no-speech' && code !== 'aborted') {
        setError(`Error de voz: ${code}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (intentionalStopRef.current || !enabledRef.current) return;
      // Chrome corta el reconocimiento continuo: recrear instancia (no reusar la misma)
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!enabledRef.current || intentionalStopRef.current) return;
        startListeningRef.current();
      }, 320);
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

    const kickOff = async () => {
      // Desbloquear micrófono en algunos navegadores antes del SpeechRecognition
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        // SpeechRecognition pedirá permiso igual
      }
      try {
        recognition.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setError('No se pudo iniciar el micrófono');
      }
    };

    void kickOff();
  }, [matchSpokenTokens]);

  startListeningRef.current = startListening;

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
