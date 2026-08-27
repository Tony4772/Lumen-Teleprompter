import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechFollowerOptions {
  enabled: boolean;
  scriptContent: string;
  onMatchProgress?: (ratio: number, matchedWord: string) => void;
}

export function useSpeechFollower({ enabled, scriptContent, onMatchProgress }: SpeechFollowerOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [recognizedWordsCount, setRecognizedWordsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const scriptWordsRef = useRef<string[]>([]);
  const currentWordPointerRef = useRef(0);

  // Extract clean words array from script
  useEffect(() => {
    const clean = scriptContent
      .replace(/\[.*?\]/g, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
      .toLowerCase();
    scriptWordsRef.current = clean.trim().split(/\s+/).filter(Boolean);
    currentWordPointerRef.current = 0;
  }, [scriptContent]);

  const startListening = useCallback(() => {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('El reconocimiento de voz no es compatible con este navegador.');
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES'; // default to Spanish, or can adapt

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Error de voz: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Restart if still enabled
        if (enabled && recognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            interimTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const cleanTranscript = interimTranscript.trim().toLowerCase();
        setLastTranscript(cleanTranscript);

        // Find match in script
        const spokenTokens = cleanTranscript.split(/\s+/).filter(Boolean);
        const scriptWords = scriptWordsRef.current;
        if (scriptWords.length === 0 || spokenTokens.length === 0) return;

        const latestSpoken = spokenTokens[spokenTokens.length - 1];
        
        // Search forward from current pointer
        const searchStart = Math.max(0, currentWordPointerRef.current - 5);
        const searchEnd = Math.min(scriptWords.length, currentWordPointerRef.current + 30);
        
        for (let idx = searchStart; idx < searchEnd; idx++) {
          const scriptWord = scriptWords[idx];
          if (scriptWord.includes(latestSpoken) || latestSpoken.includes(scriptWord)) {
            currentWordPointerRef.current = idx;
            const progress = idx / (scriptWords.length - 1 || 1);
            setRecognizedWordsCount(idx);
            if (onMatchProgress) {
              onMatchProgress(progress, scriptWord);
            }
            break;
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setError('No se pudo iniciar el micrófono');
    }
  }, [enabled, onMatchProgress]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetVoiceTracking = useCallback(() => {
    currentWordPointerRef.current = 0;
    setRecognizedWordsCount(0);
    setLastTranscript('');
  }, []);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening]);

  return {
    isListening,
    lastTranscript,
    recognizedWordsCount,
    totalWordsCount: scriptWordsRef.current.length,
    error,
    resetVoiceTracking,
  };
}
