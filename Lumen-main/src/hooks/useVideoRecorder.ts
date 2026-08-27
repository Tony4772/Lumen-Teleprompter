import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';
import {
  setSharedCameraStream,
  getSharedCameraStream,
  releaseSharedCameraStreamSync,
  setPreviewCaptureAllowed,
  isAppleTouchDevice,
} from '../utils/cameraStreamStore';

export const getSupportedVideoMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  // Escritorio: WebM. iPhone/Safari: MP4 primero.
  const apple = isAppleTouchDevice();
  const webmTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];
  const mp4Types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];
  const candidateTypes = apple ? [...mp4Types, ...webmTypes] : [...webmTypes, ...mp4Types];
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
  const preferShare = isAppleTouchDeviceLocal();

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
      message: isAppleTouchDeviceLocal()
        ? 'Si no lo ves en Archivos, vuelve a tocar Guardar y elige “Guardar en Archivos”.'
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
  const preparedStreamRef = useRef<MediaStream | null>(null);
  const ownedAudioTracksRef = useRef<MediaStreamTrack[]>([]);
  const startingLockRef = useRef(false);
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

  /**
   * Debe llamarse DENTRO del gesto del usuario (toque Iniciar).
   * En iPhone, getUserMedia DESPUÉS de la cuenta regresiva falla con NotAllowedError.
   */
  const prepareRecordingStream = useCallback(async (): Promise<boolean> => {
    setRecorderError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecorderError('Este navegador no puede usar la cámara.');
      return false;
    }

    const existing =
      preparedStreamRef.current || activeStreamRef.current || getSharedCameraStream();
    if (
      existing &&
      existing.getVideoTracks().some((t) => t.readyState === 'live') &&
      existing.getAudioTracks().some((t) => t.readyState === 'live')
    ) {
      setPreviewCaptureAllowed(false);
      existing.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      preparedStreamRef.current = existing;
      activeStreamRef.current = existing;
      setSharedCameraStream(existing, { stopPrevious: false });
      return true;
    }

    // Evitar que la preview abra otro getUserMedia encima
    setPreviewCaptureAllowed(false);
    // Liberar preview video-only YA (sync) para no bloquear el AV
    releaseSharedCameraStreamSync();

    try {
      // Constraints simples: en iOS opciones avanzadas de audio suelen romper el permiso
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });

      if (stream.getVideoTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setPreviewCaptureAllowed(true);
        setRecorderError('No se abrió la cámara. Toca Iniciar otra vez.');
        return false;
      }
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setPreviewCaptureAllowed(true);
        setRecorderError('No se abrió el micrófono. Toca Iniciar y elige Permitir.');
        return false;
      }

      preparedStreamRef.current = stream;
      activeStreamRef.current = stream;
      ownedAudioTracksRef.current = stream.getAudioTracks();
      setSharedCameraStream(stream, { stopPrevious: false });
      return true;
    } catch (err: any) {
      console.error('prepareRecordingStream:', err?.name || err);
      setPreviewCaptureAllowed(true);
      setRecorderError(
        err?.name === 'NotAllowedError'
          ? 'Toca Permitir cámara y micrófono, luego Iniciar otra vez.'
          : 'No se pudo abrir cámara/mic. Toca Iniciar otra vez.'
      );
      return false;
    }
  }, []);

  /** Arranca MediaRecorder sobre el stream YA preparado (sin nuevo getUserMedia tras countdown). */
  const startRecording = useCallback(
    async (_existingStream?: MediaStream | null, _options?: { videoOnly?: boolean }) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        return true;
      }
      if (startingLockRef.current) {
        return false;
      }
      startingLockRef.current = true;
      setRecorderError(null);
      recordedChunksRef.current = [];

      if (typeof MediaRecorder === 'undefined') {
        setRecorderError('Este navegador no puede grabar video.');
        setIsRecording(false);
        startingLockRef.current = false;
        return false;
      }

      try {
        let stream =
          preparedStreamRef.current ||
          activeStreamRef.current ||
          getSharedCameraStream() ||
          null;

        const streamOk =
          !!stream &&
          stream.getVideoTracks().some((t) => t.readyState === 'live') &&
          stream.getAudioTracks().some((t) => t.readyState === 'live');

        if (!streamOk) {
          const prepared = await prepareRecordingStream();
          if (!prepared) {
            startingLockRef.current = false;
            setIsRecording(false);
            return false;
          }
          stream = preparedStreamRef.current;
        }

        if (!stream) {
          setRecorderError('No hay cámara lista. Toca Iniciar otra vez.');
          startingLockRef.current = false;
          setIsRecording(false);
          return false;
        }

        setSharedCameraStream(stream, { stopPrevious: false });
        stream.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
        stream.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
        ownedAudioTracksRef.current = stream.getAudioTracks();
        activeStreamRef.current = stream;
        preparedStreamRef.current = stream;

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
          const blob = new Blob(chunks, { type: finalMimeType.split(';')[0] });
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

        // En iPhone, start(timeslice) a veces falla o deja tomas vacías
        try {
          if (isAppleTouchDevice()) {
            recorder.start();
          } else {
            recorder.start(1000);
          }
        } catch {
          try {
            recorder.start();
          } catch (e) {
            console.error('MediaRecorder.start failed', e);
            setRecorderError('No se pudo iniciar el grabador. Toca Iniciar otra vez.');
            startingLockRef.current = false;
            setIsRecording(false);
            return false;
          }
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
        setRecorderError('No se pudo grabar. Toca Iniciar otra vez.');
        setIsRecording(false);
        startingLockRef.current = false;
        return false;
      }
    },
    [scriptId, scriptTitle, prepareRecordingStream]
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
    prepareRecordingStream,
    startRecording,
    stopRecording,
    clearLatestTake,
    deleteTakeFromHistory,
    clearAllTakes,
    activeStream: activeStreamRef.current,
  };
};
