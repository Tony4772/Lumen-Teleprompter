import { useState, useEffect, useRef, useCallback } from 'react';
import { extractScriptWords, normalizeSpeechToken } from '../utils/prompterUtils';
import { isAppleTouchDevice } from '../utils/cameraStreamStore';

interface SpeechFollowerOptions {
  enabled: boolean;
  scriptContent: string;
  onMatchProgress?: (ratio: number, matchedWord: string, wordIndex: number) => void;
  onPermissionDenied?: () => void;
  onUnsupported?: (message: string) => void;
  suspended?: boolean;
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

export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function useSpeechFollower({
  enabled,
  scriptContent,
  onMatchProgress,
  onPermissionDenied,
  onUnsupported,
  suspended = false,
}: SpeechFollowerOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [recognizedWordsCount, setRecognizedWordsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const scriptWordsRef = useRef<string[]>([]);
  const currentWordPointerRef = useRef(0);
  const enabledRef = useRef(enabled);
  const suspendedRef = useRef(suspended);
  const onMatchProgressRef = useRef(onMatchProgress);
  const onPermissionDeniedRef = useRef(onPermissionDenied);
  const onUnsupportedRef = useRef(onUnsupported);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const intentionalStopRef = useRef(false);
  const notAllowedRetriesRef = useRef(0);

  enabledRef.current = enabled;
  suspendedRef.current = suspended;
  onMatchProgressRef.current = onMatchProgress;
  onPermissionDeniedRef.current = onPermissionDenied;
  onUnsupportedRef.current = onUnsupported;

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
    if (suspendedRef.current || !enabledRef.current) {
      return;
    }

    // En iPhone (Safari/Chrome) el reconocimiento continuo de voz del navegador
    // no es fiable: no pedimos “ve a ajustes de Chrome”.
    if (isAppleTouchDevice()) {
      const msg =
        'En iPhone el modo Voz no está disponible aún. Usa Iniciar: el texto avanza solo (ajusta la velocidad WPM).';
      setError(msg);
      onUnsupportedRef.current?.(msg);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg =
        'Este navegador no soporta seguimiento por voz. Prueba Chrome en Android o en el computador.';
      setError(msg);
      onUnsupportedRef.current?.(msg);
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
    const isMobile = /Android/i.test(navigator.userAgent);
    recognition.continuous = !isMobile;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      notAllowedRetriesRef.current = 0;
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      const code = event?.error as string;

      if (code === 'no-speech' || code === 'aborted' || code === 'network') {
        return;
      }

      if (code === 'not-allowed' || code === 'service-not-allowed') {
        if (notAllowedRetriesRef.current < 1 && enabledRef.current && !suspendedRef.current) {
          notAllowedRetriesRef.current += 1;
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (enabledRef.current && !suspendedRef.current) startListeningRef.current();
          }, 500);
          return;
        }
        intentionalStopRef.current = true;
        enabledRef.current = false;
        setIsListening(false);
        const msg =
          'Cuando el teléfono pida acceso al micrófono, toca Permitir y vuelve a activar Voz.';
        setError(msg);
        onPermissionDeniedRef.current?.();
        onUnsupportedRef.current?.(msg);
        return;
      }

      if (code === 'audio-capture') {
        // Si el micrófono fue tomado por la grabación de video, suspender ASR
        intentionalStopRef.current = true;
        setIsListening(false);
        return;
      }

      console.warn('Speech error ignored in UI:', code);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (intentionalStopRef.current || !enabledRef.current || suspendedRef.current) return;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!enabledRef.current || intentionalStopRef.current || suspendedRef.current) return;
        startListeningRef.current();
      }, isMobile ? 400 : 300);
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
      if (!enabledRef.current || suspendedRef.current) return;

      try {
        recognition.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (!enabledRef.current || suspendedRef.current) return;
          try {
            recognition.start();
          } catch (e2) {
            console.error('Speech start retry failed:', e2);
          }
        }, 350);
      }
    };

    void kickOff();
  }, [matchSpokenTokens]);

  startListeningRef.current = startListening;

  const resetVoiceTracking = useCallback(() => {
    currentWordPointerRef.current = 0;
    setRecognizedWordsCount(0);
    setLastTranscript('');
    // No empujar wordIndex 0 al canvas aquí: evita salto al top al (des)activar
  }, []);

  useEffect(() => {
    if (enabled && !suspended) {
      if (isAppleTouchDevice()) {
        const msg =
          'En iPhone el modo Voz no está disponible aún. Usa Iniciar: el texto avanza solo (ajusta WPM).';
        setError(msg);
        onUnsupportedRef.current?.(msg);
        return;
      }
      if (!isSpeechRecognitionAvailable()) {
        const msg =
          'Este navegador no soporta seguimiento por voz. Prueba Chrome en Android o en el computador.';
        setError(msg);
        onUnsupportedRef.current?.(msg);
        return;
      }
      notAllowedRetriesRef.current = 0;
      const t = window.setTimeout(() => {
        if (enabledRef.current && !suspendedRef.current) startListening();
      }, 120);
      return () => {
        window.clearTimeout(t);
        stopListening();
      };
    }

    stopListening();
    setError(null);
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, suspended]);

  return {
    isListening,
    lastTranscript,
    recognizedWordsCount,
    totalWordsCount: scriptWordsRef.current.length,
    error,
    resetVoiceTracking,
  };
}
