import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';
import { getSharedCameraStream } from '../utils/cameraStreamStore';

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

function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function buildVideoFile(blob: Blob, customFilename?: string): File {
  const rawType = (blob.type || '').toLowerCase();
  const isMp4 = rawType.includes('mp4');
  const isWebm = rawType.includes('webm');
  const ext = isMp4 ? 'mp4' : isWebm ? 'webm' : isAppleTouchDevice() ? 'mp4' : 'webm';
  // iOS reconoce mejor video/mp4; si el blob ya trae tipo, respetarlo
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
      message: isAppleTouchDevice()
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

  const startRecording = useCallback(
    async (
      existingStream?: MediaStream | null,
      options?: { videoOnly?: boolean }
    ) => {
      setRecorderError(null);
      recordedChunksRef.current = [];
      ownedAudioTracksRef.current = [];
      const videoOnly = Boolean(options?.videoOnly);

      if (typeof MediaRecorder === 'undefined') {
        setRecorderError('Este navegador no puede grabar video. Prueba Chrome o Safari reciente.');
        setIsRecording(false);
        return false;
      }

      try {
        const shared = existingStream || getSharedCameraStream();
        let stream: MediaStream;

        if (shared && shared.getVideoTracks().some((t) => t.readyState === 'live')) {
          // Reutilizar la misma cámara del preview (clave en móvil)
          const videoTrack = shared.getVideoTracks()[0];
          const tracks: MediaStreamTrack[] = [videoTrack];

          if (!videoOnly) {
            try {
              const audioOnly = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
                video: false,
              });
              const audioTracks = audioOnly.getAudioTracks();
              ownedAudioTracksRef.current = audioTracks;
              tracks.push(...audioTracks);
            } catch {
              // Seguir solo con video si el mic falla
            }
          }

          stream = new MediaStream(tracks);
        } else {
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
          ownedAudioTracksRef.current = stream.getAudioTracks();
        }

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
          setRecorderError('Error durante la grabación. Intenta de nuevo.');
        };

        recorder.onstop = () => {
          ownedAudioTracksRef.current.forEach((t) => {
            try {
              t.stop();
            } catch {
              // ignore
            }
          });
          ownedAudioTracksRef.current = [];

          const chunks = recordedChunksRef.current;
          if (!chunks.length) {
            setRecorderError(
              'No se generó video. En el teléfono: permite Cámara (y Mic) y vuelve a Iniciar.'
            );
            setIsRecording(false);
            return;
          }

          const finalMimeType =
            mimeType || recorder.mimeType || chunks[0]?.type || 'video/webm';
          const blob = new Blob(chunks, { type: finalMimeType });
          if (blob.size < 1000) {
            setRecorderError('La grabación quedó vacía o demasiado corta. Intenta de nuevo.');
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

        // timeslice ayuda a que móvil acumule chunks antes del stop
        try {
          recorder.start(1000);
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
        setRecorderError(
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara/mic denegado. Actívalo en Ajustes del navegador y reintenta.'
            : 'No se pudo iniciar la grabación. Revisa permisos de cámara en el teléfono.'
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
