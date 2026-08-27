import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';
import { setSharedCameraStream, releaseSharedCameraStream, isAppleTouchDevice } from '../utils/cameraStreamStore';

export const getSupportedVideoMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  // mp4 primero: iOS / Safari móvil
  const candidateTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};

function isAppleTouchDeviceLocal(): boolean {
  return isAppleTouchDevice();
}

function buildVideoFile(blob: Blob, customFilename?: string): File {
  const rawType = (blob.type || '').toLowerCase();
  const isMp4 = rawType.includes('mp4');
  const isWebm = rawType.includes('webm');
  const ext = isMp4 ? 'mp4' : isWebm ? 'webm' : isAppleTouchDeviceLocal() ? 'mp4' : 'webm';
  const mime = rawType.startsWith('video/')
    ? rawType.split(';')[0]
    : ext === 'mp4'
      ? 'video/mp4'
      : 'video/webm';

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const base = (customFilename || `grabacion-lumen-${stamp}`)
    .replace(/\.(mp4|webm)$/i, '')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  const filename = `${base || 'grabacion-lumen'}.${ext}`;

  return new File([blob], filename, { type: mime, lastModified: Date.now() });
}

export type SaveVideoResult = {
  ok: boolean;
  method: 'share' | 'download' | 'cancelled';
  message: string;
};

/**
 * En iPhone el <a download> NO guarda bien en Archivos.
 * Usamos Web Share (Compartir → Guardar en Archivos / Guardar Video).
 */
export async function saveRecordedVideo(
  blob: Blob,
  customFilename?: string
): Promise<SaveVideoResult> {
  if (!blob || blob.size < 100) {
    return {
      ok: false,
      method: 'download',
      message: 'El video está vacío. Vuelve a grabar la toma.',
    };
  }

  const file = buildVideoFile(blob, customFilename);

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: file.name,
        text: 'Grabación Lumen Teleprompter',
      });
      return {
        ok: true,
        method: 'share',
        message:
          'En el menú de iPhone elige “Guardar en Archivos” o “Guardar Video” (Fotos). Luego busca por el nombre del archivo.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          ok: false,
          method: 'cancelled',
          message: 'No se guardó: cancelaste el menú de compartir.',
        };
      }
      // continuar al fallback
    }
  }

  // Fallback escritorio / navegadores sin share de archivos
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = file.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);

    return {
      ok: true,
      method: 'download',
      message: isAppleTouchDeviceLocal()
        ? 'Si no lo ves en Archivos, vuelve a tocar Guardar y en el menú elige “Guardar en Archivos” (Descargas o En mi iPhone).'
        : `Descarga iniciada: ${file.name}`,
    };
  } catch {
    return {
      ok: false,
      method: 'download',
      message: 'No se pudo guardar el video en este navegador.',
    };
  }
}

/** @deprecated usar saveRecordedVideo */
export const downloadRecordedVideo = (blob: Blob, customFilename?: string) => {
  void saveRecordedVideo(blob, customFilename);
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const ownedAudioTracksRef = useRef<MediaStreamTrack[]>([]);
  const onFinishedRef = useRef(onRecordingFinished);
  onFinishedRef.current = onRecordingFinished;

  useEffect(() => {
    if (!recorderError) return;
    const t = window.setTimeout(() => setRecorderError(null), 7000);
    return () => window.clearTimeout(t);
  }, [recorderError]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startingLockRef = useRef(false);

  const startRecording = useCallback(
    async (
      _existingStream?: MediaStream | null,
      options?: { videoOnly?: boolean }
    ) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        return true;
      }
      if (startingLockRef.current) {
        return false;
      }
      startingLockRef.current = true;

      setRecorderError(null);
      recordedChunksRef.current = [];
      ownedAudioTracksRef.current = [];
      const videoOnly = Boolean(options?.videoOnly);

      if (typeof MediaRecorder === 'undefined') {
        setRecorderError('Este navegador no puede grabar video.');
        setIsRecording(false);
        startingLockRef.current = false;
        return false;
      }

      const openAvStream = async (): Promise<MediaStream> => {
        // Liberar preview previa (video-only) para que iPhone no bloquee el 2º getUserMedia
        await releaseSharedCameraStream(400);

        return navigator.mediaDevices.getUserMedia({
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
      };

      try {
        let stream: MediaStream;
        try {
          stream = await openAvStream();
        } catch (firstErr: any) {
          const name = firstErr?.name || '';
          // Solo reintentar si la cámara estaba ocupada / abortada (típico en iOS)
          const retryable =
            name === 'NotReadableError' ||
            name === 'AbortError' ||
            name === 'InvalidStateError' ||
            name === 'NotAllowedError';
          if (!retryable) throw firstErr;
          console.warn('getUserMedia retry after:', name);
          await releaseSharedCameraStream(600);
          stream = await openAvStream();
        }

        if (!videoOnly && stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          setRecorderError('No se escuchó el micrófono. Toca Iniciar de nuevo y acepta el micrófono.');
          setIsRecording(false);
          startingLockRef.current = false;
          return false;
        }

        setSharedCameraStream(stream, { stopPrevious: false });
        ownedAudioTracksRef.current = stream.getAudioTracks();
        activeStreamRef.current = stream;

        const mimeType = getSupportedVideoMimeType();
        const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, recorderOptions);
        } catch {
          recorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          setRecorderError('Se interrumpió la grabación. Toca Iniciar otra vez.');
        };

        recorder.onstop = () => {
          ownedAudioTracksRef.current.forEach((t) => {
            try {
              t.enabled = false;
            } catch {
              // ignore
            }
          });
          ownedAudioTracksRef.current = [];

          const chunks = recordedChunksRef.current;
          if (!chunks.length) {
            setRecorderError('No quedó video. Toca Iniciar e inténtalo otra vez.');
            setIsRecording(false);
            return;
          }

          const finalMimeType =
            mimeType || recorder.mimeType || chunks[0]?.type || 'video/mp4';
          const blob = new Blob(chunks, { type: finalMimeType });
          if (blob.size < 1000) {
            setRecorderError('La toma quedó vacía. Toca Iniciar e inténtalo otra vez.');
            setIsRecording(false);
            return;
          }

          const url = URL.createObjectURL(blob);
          const duration = Math.max(
            1,
            Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
          );
          const fileSizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));

          const newTake: RecordedTake = {
            id: `take_${Date.now()}`,
            scriptId,
            scriptTitle: scriptTitle || 'Guion de Grabación',
            url,
            blob,
            durationSeconds: duration,
            createdAt: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            fileSizeMb,
            mimeType: finalMimeType,
          };

          setLatestTake(newTake);
          setTakesHistory((prev) => [newTake, ...prev]);
          onFinishedRef.current?.(newTake);
        };

        try {
          recorder.start(1000);
        } catch {
          recorder.start();
        }
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        setRecordingSeconds(0);
        setRecorderError(null);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        startingLockRef.current = false;
        return true;
      } catch (err: any) {
        console.error('Error starting video recording:', err);
        // Mensaje corto, sin “ve a ajustes de Chrome”
        setRecorderError(
          err?.name === 'NotAllowedError'
            ? 'El iPhone bloqueó cámara/mic. Toca Iniciar otra vez y elige Permitir.'
            : 'No se pudo grabar. Toca Iniciar otra vez.'
        );
        setIsRecording(false);
        startingLockRef.current = false;
        return false;
      }
    },
    [scriptId, scriptTitle]
  );

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        if (recorder.state === 'recording') {
          try {
            recorder.requestData();
          } catch {
            // ignore
          }
        }
        recorder.stop();
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
        } catch {
          // Ignored
        }
      }
      return filtered;
    });
    setLatestTake((prev) => (prev?.id === takeId ? null : prev));
  }, []);

  const clearAllTakes = useCallback(() => {
    setTakesHistory((prev) => {
      prev.forEach((t) => {
        try {
          URL.revokeObjectURL(t.url);
        } catch {
          // Ignored
        }
      });
      return [];
    });
    setLatestTake(null);
  }, []);

  const clearRecorderError = useCallback(() => setRecorderError(null), []);

  return {
    isRecording,
    recordingSeconds,
    latestTake,
    takesHistory,
    recorderError,
    clearRecorderError,
    startRecording,
    stopRecording,
    clearLatestTake,
    deleteTakeFromHistory,
    clearAllTakes,
    activeStream: activeStreamRef.current,
  };
};
