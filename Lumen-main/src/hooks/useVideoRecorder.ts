import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';
import { setSharedCameraStream, getSharedCameraStream, isAppleTouchDevice } from '../utils/cameraStreamStore';
import {
  beginAvCaptureFromUserGesture,
  getReadyAvStream,
  pickRecorderMimeType,
} from '../utils/recordingCapture';

export const getSupportedVideoMimeType = (): string => pickRecorderMimeType();

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isAppleTouchDevice() || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function buildVideoFile(blob: Blob, customFilename?: string): File {
  const rawType = (blob.type || '').toLowerCase();
  const isMp4 = rawType.includes('mp4');
  const isWebm = rawType.includes('webm');
  const ext = isMp4 ? 'mp4' : isWebm ? 'webm' : isAppleTouchDevice() ? 'mp4' : 'webm';
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

  return new File([blob], `${base || 'grabacion-lumen'}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
}

export type SaveVideoResult = {
  ok: boolean;
  method: 'share' | 'download' | 'cancelled';
  message: string;
};

export async function saveRecordedVideo(
  blob: Blob,
  customFilename?: string
): Promise<SaveVideoResult> {
  if (!blob || blob.size < 100) {
    return { ok: false, method: 'download', message: 'El video está vacío. Vuelve a grabar.' };
  }

  const file = buildVideoFile(blob, customFilename);
  const isMobile = isMobileDevice();

  // En dispositivos móviles (Android + iOS), WebShare permite guardar directo en Fotos/Galería o compartir
  const canShare =
    isMobile &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShare) {
    try {
      await navigator.share({
        files: [file],
        title: file.name,
        text: 'Grabación Lumen Teleprompter',
      });
      return {
        ok: true,
        method: 'share',
        message: 'Video guardado o compartido con éxito.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { ok: false, method: 'cancelled', message: 'Cancelaste el menú de compartir.' };
      }
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 4000);
    return { ok: true, method: 'download', message: `Descarga iniciada: ${file.name}` };
  } catch {
    return { ok: false, method: 'download', message: 'No se pudo guardar el video.' };
  }
}

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
  const recordingStartTimeRef = useRef(0);
  const sessionStreamRef = useRef<MediaStream | null>(null);
  const onFinishedRef = useRef(onRecordingFinished);
  onFinishedRef.current = onRecordingFinished;

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

  /**
   * Recibe la Promise disparada SÍNCRONAMENTE en el onClick.
   */
  const adoptAvPromise = useCallback(async (avPromise: Promise<MediaStream>): Promise<boolean> => {
    setRecorderError(null);
    try {
      const stream = await avPromise;
      sessionStreamRef.current = stream;
      setSharedCameraStream(stream, { stopPrevious: false });
      return true;
    } catch (err: any) {
      console.error('adoptAvPromise failed:', err?.name, err?.message, err);
      sessionStreamRef.current = null;

      // Si ya hay un stream usable (carrera), úsalo
      const ready = getReadyAvStream();
      if (ready) {
        sessionStreamRef.current = ready;
        return true;
      }

      setRecorderError(
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Permiso bloqueado. Toca el candado junto a la URL, permite Cámara y Micrófono y toca Iniciar.'
          : err?.name === 'NotReadableError' || err?.name === 'TrackStartError'
            ? 'La cámara o el micrófono están en uso por otra app. Ciérrala y vuelve a Iniciar.'
            : err?.name === 'OverconstrainedError'
              ? 'Ajustando cámara... Toca Iniciar otra vez.'
              : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
                ? 'No se detectó cámara o micrófono en este dispositivo.'
                : 'No se pudo abrir cámara y micrófono. Toca Iniciar otra vez.'
      );
      return false;
    }
  }, []);

  /** Compat: dispara captura (mejor usar beginAvCaptureFromUserGesture en el click). */
  const prepareMicForRecording = useCallback(async (): Promise<boolean> => {
    return adoptAvPromise(beginAvCaptureFromUserGesture());
  }, [adoptAvPromise]);

  const startRecording = useCallback(
    async (_existing?: MediaStream | null, _options?: { videoOnly?: boolean }) => {
      setRecorderError(null);
      recordedChunksRef.current = [];

      if (typeof MediaRecorder === 'undefined') {
        setRecorderError('Este navegador no puede grabar video.');
        setIsRecording(false);
        return false;
      }

      const stream =
        sessionStreamRef.current &&
        sessionStreamRef.current.getVideoTracks().some((t) => t.readyState === 'live')
          ? sessionStreamRef.current
          : (getReadyAvStream() || getSharedCameraStream());

      if (!stream || !stream.getVideoTracks().some((t) => t.readyState === 'live')) {
        setRecorderError('Cámara no lista. Toca Iniciar otra vez.');
        setIsRecording(false);
        return false;
      }

      sessionStreamRef.current = stream;
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });

      try {
        const mimeType = pickRecorderMimeType();
        let recorder: MediaRecorder;

        if (mimeType) {
          try {
            recorder = new MediaRecorder(stream, { mimeType });
          } catch {
            try {
              recorder = new MediaRecorder(stream, { mimeType: mimeType.split(';')[0] });
            } catch {
              recorder = new MediaRecorder(stream);
            }
          }
        } else {
          recorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          setRecorderError('Error durante la grabación. Toca Iniciar otra vez.');
        };

        const finalizeTake = () => {
          const chunks = recordedChunksRef.current;
          if (!chunks.length) {
            setRecorderError('No quedó video grabado. Graba unos segundos y pausa.');
            setIsRecording(false);
            return;
          }

          const finalMime = (
            recorder.mimeType ||
            mimeType ||
            chunks[0]?.type ||
            'video/mp4'
          ).split(';')[0];
          const blob = new Blob(chunks, { type: finalMime });
          if (blob.size < 1000) {
            setRecorderError('La toma quedó vacía. Graba un poco más y pausa.');
            setIsRecording(false);
            return;
          }

          const url = URL.createObjectURL(blob);
          const duration = Math.max(
            1,
            Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
          );

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
            fileSizeMb: Number((blob.size / (1024 * 1024)).toFixed(2)),
            mimeType: finalMime,
          };

          setLatestTake(newTake);
          setTakesHistory((prev) => [newTake, ...prev]);
          onFinishedRef.current?.(newTake);
        };

        recorder.onstop = () => {
          // Breve delay para garantizar que el último chunk esté procesado
          window.setTimeout(finalizeTake, 80);
        };

        // En iOS Safari, no usar timeslice para evitar pérdida de paquetes de audio en WebKit
        if (isAppleTouchDevice()) {
          recorder.start();
        } else {
          try {
            recorder.start(1000);
          } catch {
            recorder.start();
          }
        }

        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        setRecordingSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);

        return true;
      } catch (err) {
        console.error('startRecording:', err);
        setRecorderError('No se pudo empezar a grabar. Toca Iniciar otra vez.');
        setIsRecording(false);
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
        console.warn('stopRecording:', e);
      }
    }
    setIsRecording(false);
  }, []);

  const clearLatestTake = useCallback(() => setLatestTake(null), []);

  const deleteTakeFromHistory = useCallback((takeId: string) => {
    setTakesHistory((prev) => {
      const target = prev.find((t) => t.id === takeId);
      if (target) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {
          // ignore
        }
      }
      return prev.filter((t) => t.id !== takeId);
    });
    setLatestTake((prev) => (prev?.id === takeId ? null : prev));
  }, []);

  const clearAllTakes = useCallback(() => {
    setTakesHistory((prev) => {
      prev.forEach((t) => {
        try {
          URL.revokeObjectURL(t.url);
        } catch {
          // ignore
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
    adoptAvPromise,
    prepareMicForRecording,
    startRecording,
    stopRecording,
    clearLatestTake,
    deleteTakeFromHistory,
    clearAllTakes,
    activeStream: sessionStreamRef.current,
  };
};

