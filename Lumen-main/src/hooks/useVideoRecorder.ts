import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';
import { setSharedCameraStream, isAppleTouchDevice } from '../utils/cameraStreamStore';
import {
  acquireAvStream,
  buildRecorderStream,
  getLiveAvStream,
  isMobileRecordingDevice,
  isWebKitMediaRecorder,
  pickRecorderMimeType,
  type RecorderStreamHandle,
} from '../utils/recordingCapture';

export const getSupportedVideoMimeType = (): string => pickRecorderMimeType();

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
  const filename = `${base || 'grabacion-lumen'}.${ext}`;

  return new File([blob], filename, { type: mime, lastModified: Date.now() });
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
    return {
      ok: false,
      method: 'download',
      message: 'El video está vacío. Vuelve a grabar la toma.',
    };
  }

  const file = buildVideoFile(blob, customFilename);
  const preferShare = isAppleTouchDevice();

  const canShareFiles =
    preferShare &&
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
        message: 'En el menú elige “Guardar en Archivos” o “Guardar Video”.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          ok: false,
          method: 'cancelled',
          message: 'Cancelaste el menú de compartir.',
        };
      }
    }
  }

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
      message: `Descarga iniciada: ${file.name}`,
    };
  } catch {
    return {
      ok: false,
      method: 'download',
      message: 'No se pudo guardar el video en este navegador.',
    };
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
  const recordingStartTimeRef = useRef<number>(0);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const preparedCameraRef = useRef<MediaStream | null>(null);
  const recorderHandleRef = useRef<RecorderStreamHandle | null>(null);
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
      recorderHandleRef.current?.cleanup();
    };
  }, []);

  /**
   * Debe llamarse en el toque Iniciar (gesto).
   * Abre video+audio juntos y los deja listos para preview + MediaRecorder.
   * En escritorio sin countdown también es seguro; en móvil con countdown es obligatorio.
   */
  const prepareMicForRecording = useCallback(async (): Promise<boolean> => {
    setRecorderError(null);

    const existing = preparedCameraRef.current || getLiveAvStream();
    if (existing) {
      existing.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      preparedCameraRef.current = existing;
      setSharedCameraStream(existing, { stopPrevious: false });
      return true;
    }

    try {
      const stream = await acquireAvStream();
      preparedCameraRef.current = stream;
      return true;
    } catch (err: any) {
      console.error('prepareAvStream:', err);
      preparedCameraRef.current = null;
      if (err?.message === 'NO_AUDIO') {
        setRecorderError('No hay micrófono. Toca Permitir micrófono e Iniciar otra vez.');
      } else if (err?.name === 'NotAllowedError') {
        setRecorderError('Toca Permitir cámara y micrófono, luego Iniciar otra vez.');
      } else {
        setRecorderError('No se pudo abrir cámara/mic. Toca Iniciar otra vez.');
      }
      return false;
    }
  }, []);

  const startRecording = useCallback(
    async (_existingStream?: MediaStream | null, options?: { videoOnly?: boolean }) => {
      setRecorderError(null);
      recordedChunksRef.current = [];
      const videoOnly = Boolean(options?.videoOnly);

      if (typeof MediaRecorder === 'undefined') {
        setRecorderError('Este navegador no puede grabar video.');
        setIsRecording(false);
        return false;
      }

      try {
        recorderHandleRef.current?.cleanup();
        recorderHandleRef.current = null;

        let cameraStream =
          preparedCameraRef.current || getLiveAvStream() || null;

        // Si aún no hay AV (p. ej. escritorio sin prepare), adquirir ahora
        if (!cameraStream || (videoOnly === false && !cameraStream.getAudioTracks().length)) {
          if (videoOnly) {
            cameraStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' },
              audio: false,
            });
            setSharedCameraStream(cameraStream, { stopPrevious: true });
          } else {
            cameraStream = await acquireAvStream();
          }
          preparedCameraRef.current = cameraStream;
        }

        cameraStream.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });

        const handle = videoOnly
          ? {
              recordStream: cameraStream,
              cameraStream,
              cleanup: () => {},
            }
          : await buildRecorderStream(cameraStream);

        recorderHandleRef.current = handle;
        activeStreamRef.current = handle.recordStream;

        const mimeType = pickRecorderMimeType();
        const recorderOptions: MediaRecorderOptions = {};
        if (mimeType) recorderOptions.mimeType = mimeType;
        // Empujar bitrate de audio ayuda a que algunos WebKit lo incluyan
        if (isWebKitMediaRecorder()) {
          recorderOptions.audioBitsPerSecond = 128000;
          recorderOptions.videoBitsPerSecond = 2_500_000;
        }

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(handle.recordStream, recorderOptions);
        } catch {
          try {
            recorder = new MediaRecorder(handle.recordStream, mimeType ? { mimeType } : {});
          } catch {
            recorder = new MediaRecorder(handle.recordStream);
          }
        }
        mediaRecorderRef.current = recorder;

        const audioTrackCount = handle.recordStream.getAudioTracks().filter(
          (t) => t.readyState === 'live' && t.enabled
        ).length;
        console.info('[lumen-recorder]', {
          mimeType: mimeType || recorder.mimeType,
          audioTracks: audioTrackCount,
          videoTracks: handle.recordStream.getVideoTracks().length,
          webkit: isWebKitMediaRecorder(),
          mobile: isMobileRecordingDevice(),
        });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          setRecorderError('Error durante la grabación. Intenta de nuevo.');
        };

        recorder.onstop = () => {
          recorderHandleRef.current?.cleanup();
          recorderHandleRef.current = null;

          const chunks = recordedChunksRef.current;
          if (!chunks.length) {
            setRecorderError('No se generó video. Permite la cámara y vuelve a Iniciar.');
            setIsRecording(false);
            return;
          }

          const finalMimeType =
            mimeType || recorder.mimeType || chunks[0]?.type || 'video/mp4';
          const blob = new Blob(chunks, { type: finalMimeType.split(';')[0] });
          if (blob.size < 1000) {
            setRecorderError('La grabación quedó vacía. Intenta de nuevo.');
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
          // WebKit: mejor sin timeslice; al parar pedimos requestData
          if (isWebKitMediaRecorder()) {
            recorder.start();
          } else {
            recorder.start(1000);
          }
        } catch {
          recorder.start();
        }

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
        recorderHandleRef.current?.cleanup();
        recorderHandleRef.current = null;
        setRecorderError(
          err?.name === 'NotAllowedError'
            ? 'Toca Permitir cámara y micrófono e Iniciar otra vez.'
            : 'No se pudo grabar. Toca Iniciar otra vez.'
        );
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
        console.warn('Error stopping media recorder:', e);
      }
    }

    setIsRecording(false);
  }, []);

  const clearLatestTake = useCallback(() => setLatestTake(null), []);

  const deleteTakeFromHistory = useCallback((takeId: string) => {
    setTakesHistory((prev) => {
      const filtered = prev.filter((t) => t.id !== takeId);
      const target = prev.find((t) => t.id === takeId);
      if (target) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {
          // ignore
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
    prepareMicForRecording,
    startRecording,
    stopRecording,
    clearLatestTake,
    deleteTakeFromHistory,
    clearAllTakes,
    activeStream: activeStreamRef.current,
  };
};
