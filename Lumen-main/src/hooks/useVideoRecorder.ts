import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';

export const getSupportedVideoMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  const candidateTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};

export const downloadRecordedVideo = (blob: Blob, customFilename?: string) => {
  const isMp4 = blob.type.includes('mp4');
  const ext = isMp4 ? 'mp4' : 'webm';
  const defaultName = `grabacion-teleprompter-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
  const filename = customFilename ? (customFilename.endsWith(`.${ext}`) ? customFilename : `${customFilename}.${ext}`) : defaultName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1200);
};

interface UseVideoRecorderOptions {
  onRecordingFinished?: (take: RecordedTake) => void;
  scriptTitle?: string;
  scriptId?: string;
}

export const useVideoRecorder = ({
  onRecordingFinished,
  scriptTitle,
  scriptId,
}: UseVideoRecorderOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [latestTake, setLatestTake] = useState<RecordedTake | null>(null);
  const [takesHistory, setTakesHistory] = useState<RecordedTake[]>([]);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(
    async (
      existingStream?: MediaStream | null,
      options?: { videoOnly?: boolean }
    ) => {
      setRecorderError(null);
      recordedChunksRef.current = [];
      const videoOnly = Boolean(options?.videoOnly);

      try {
        let stream = existingStream;

        // Si hay seguimiento por voz, no pedir audio: deja el mic libre para SpeechRecognition
        const needsFreshStream =
          !stream || (!videoOnly && stream.getAudioTracks().length === 0);

        if (needsFreshStream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
            audio: videoOnly
              ? false
              : {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
          });
        } else if (videoOnly && stream) {
          // Quitar pistas de audio del stream existente para no pelear con el ASR
          stream.getAudioTracks().forEach((t) => {
            t.stop();
            stream!.removeTrack(t);
          });
        }

        activeStreamRef.current = stream!;
        const mimeType = getSupportedVideoMimeType();
        const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};

        const recorder = new MediaRecorder(stream!, recorderOptions);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const finalMimeType = mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: finalMimeType });
          const url = URL.createObjectURL(blob);
          const duration = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
          const fileSizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));

          const newTake: RecordedTake = {
            id: `take_${Date.now()}`,
            scriptId,
            scriptTitle: scriptTitle || 'Guion de Grabación',
            url,
            blob,
            durationSeconds: duration,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            fileSizeMb,
            mimeType: finalMimeType,
          };

          setLatestTake(newTake);
          setTakesHistory((prev) => [newTake, ...prev]);

          if (onRecordingFinished) {
            onRecordingFinished(newTake);
          }
        };

        recorder.start(500);
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        setRecordingSeconds(0);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        return true;
      } catch (err: any) {
        console.error('Error starting video recording:', err);
        setRecorderError(
          err.name === 'NotAllowedError'
            ? 'Permiso de micrófono o cámara denegado. Permite el acceso para poder grabar.'
            : 'No se pudo iniciar la grabación de video.'
        );
        setIsRecording(false);
        return false;
      }
    },
    [onRecordingFinished, scriptId, scriptTitle]
  );

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }

    setIsRecording(false);
  }, []);

  const clearLatestTake = useCallback(() => {
    setLatestTake(null);
  }, []);

  const deleteTakeFromHistory = useCallback((takeId: string) => {
    setTakesHistory((prev) => {
      const filtered = prev.filter((t) => t.id !== takeId);
      const target = prev.find((t) => t.id === takeId);
      if (target) {
        try {
          URL.revokeObjectURL(target.url);
        } catch (e) {
          // Ignored
        }
      }
      return filtered;
    });
  }, []);

  return {
    isRecording,
    recordingSeconds,
    latestTake,
    takesHistory,
    recorderError,
    startRecording,
    stopRecording,
    clearLatestTake,
    deleteTakeFromHistory,
    activeStream: activeStreamRef.current,
  };
};
