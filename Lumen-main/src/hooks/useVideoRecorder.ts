import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordedTake } from '../types';
import { setSharedCameraStream, isAppleTouchDevice } from '../utils/cameraStreamStore';
import {
  acquireAvStream,
  acquireMicOnly,
  buildRecorderStream,
  combineVideoAndAudio,
  getLiveAvStream,
  getLiveVideoStream,
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
  const preparedMicTracksRef = useRef<MediaStreamTrack[]>([]);
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
      preparedMicTracksRef.current.forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  /**
   * En el toque Iniciar:
   * - WebKit (Safari / Chrome iOS): un stream video+audio
   * - Chrome Android / escritorio móvil: solo pedir mic (no soltar la cámara)
   * Nunca bloquea el inicio con cartel si el mic falla: se sigue con video.
   */
  const prepareMicForRecording = useCallback(async (): Promise<boolean> => {
    setRecorderError(null);

    const existingAv = preparedCameraRef.current || getLiveAvStream();
    if (existingAv) {
      existingAv.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      preparedCameraRef.current = existingAv;
      setSharedCameraStream(existingAv, { stopPrevious: false });
      return true;
    }

    // Chrome/Android: no liberar cámara; solo mic en el gesto
    if (!isWebKitMediaRecorder()) {
      try {
        preparedMicTracksRef.current = await acquireMicOnly();
      } catch (err) {
        console.warn('mic prepare (chromium):', err);
        preparedMicTracksRef.current = [];
      }
      return true;
    }

    // WebKit: video+audio juntos
    try {
      const stream = await acquireAvStream();
      preparedCameraRef.current = stream;
      return true;
    } catch (err: any) {
      console.warn('av prepare (webkit):', err);
      preparedCameraRef.current = null;
      // No cartel aquí: startRecording intentará de nuevo / video
      return true;
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

        let recordBase: MediaStream;

        if (videoOnly) {
          const videoOnlyStream =
            getLiveVideoStream() ||
            (await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' },
              audio: false,
            }));
          setSharedCameraStream(videoOnlyStream, { stopPrevious: false });
          recorderHandleRef.current = {
            recordStream: videoOnlyStream,
            cameraStream: videoOnlyStream,
            cleanup: () => {},
          };
          activeStreamRef.current = videoOnlyStream;
        } else if (isWebKitMediaRecorder()) {
          let cameraStream =
            preparedCameraRef.current || getLiveAvStream() || null;
          if (!cameraStream) {
            try {
              cameraStream = await acquireAvStream();
              preparedCameraRef.current = cameraStream;
            } catch (err: any) {
              // Fallback: cámara del preview + mic aparte
              const video = getLiveVideoStream();
              if (!video) throw err;
              let micTracks = preparedMicTracksRef.current.filter(
                (t) => t.readyState === 'live'
              );
              if (!micTracks.length) {
                try {
                  micTracks = await acquireMicOnly();
                } catch {
                  micTracks = [];
                }
              }
              recordBase = combineVideoAndAudio(video, micTracks);
              preparedMicTracksRef.current = [];
              const handleFallback = await buildRecorderStream(
                // build expects audio on stream — for webkit wrap; if no audio, returns as-is
                recordBase
              );
              // If combine created new stream without going through camera share AV, skip wrap issues
              recorderHandleRef.current = handleFallback;
              activeStreamRef.current = handleFallback.recordStream;
              // jump to recorder create below via flag
              cameraStream = recordBase;
            }
          }
          if (!recorderHandleRef.current) {
            cameraStream!.getAudioTracks().forEach((t) => {
              t.enabled = true;
            });
            const handle = await buildRecorderStream(cameraStream!);
            recorderHandleRef.current = handle;
            activeStreamRef.current = handle.recordStream;
          }
        } else {
          // Chromium (Android Chrome, desktop): preview video + mic
          const video =
            getLiveVideoStream() ||
            (await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' },
              audio: false,
            }));
          if (!getLiveVideoStream()) {
            setSharedCameraStream(video, { stopPrevious: true });
          }

          let micTracks = preparedMicTracksRef.current.filter(
            (t) => t.readyState === 'live'
          );
          preparedMicTracksRef.current = [];
          if (!micTracks.length) {
            try {
              micTracks = await acquireMicOnly();
            } catch {
              micTracks = [];
            }
          }

          // Si el shared ya trae audio, usarlo
          if (!micTracks.length && video.getAudioTracks().length) {
            recordBase = video;
          } else {
            recordBase = combineVideoAndAudio(video, micTracks);
          }

          recorderHandleRef.current = {
            recordStream: recordBase,
            cameraStream: video,
            cleanup: () => {
              micTracks.forEach((t) => {
                try {
                  t.stop();
                } catch {
                  // ignore
                }
              });
            },
          };
          activeStreamRef.current = recordBase;
        }

        if (!recorderHandleRef.current) {
          setRecorderError('No se pudo iniciar la grabación.');
          setIsRecording(false);
          return false;
        }

        const handle = recorderHandleRef.current;

        const mimeType = pickRecorderMimeType();
        // Safari: sin bitrates forzados (pueden dejar el archivo en 0 bytes)
        const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(handle.recordStream, recorderOptions);
        } catch {
          try {
            recorder = new MediaRecorder(handle.recordStream, { mimeType: 'video/mp4' });
          } catch {
            recorder = new MediaRecorder(handle.recordStream);
          }
        }
        mediaRecorderRef.current = recorder;

        console.info('[lumen-recorder]', {
          mimeType: mimeType || recorder.mimeType,
          audioTracks: handle.recordStream.getAudioTracks().length,
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

        const finalizeTake = () => {
          recorderHandleRef.current?.cleanup();
          recorderHandleRef.current = null;

          const chunks = recordedChunksRef.current;
          if (!chunks.length) {
            setRecorderError(
              'La toma no se guardó. Graba al menos 2–3 segundos y vuelve a pausar.'
            );
            setIsRecording(false);
            return;
          }

          const finalMimeType = (
            recorder.mimeType ||
            mimeType ||
            chunks[0]?.type ||
            'video/mp4'
          ).split(';')[0];
          const blob = new Blob(chunks, { type: finalMimeType });
          if (blob.size < 1000) {
            setRecorderError('La grabación quedó vacía. Intenta de nuevo unos segundos más.');
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

        // Safari a veces dispara onstop antes del último dataavailable
        recorder.onstop = () => {
          window.setTimeout(finalizeTake, 150);
        };

        try {
          recorder.start(1000);
        } catch {
          try {
            recorder.start();
          } catch (e) {
            console.error('MediaRecorder.start failed', e);
            setRecorderError('No se pudo iniciar el grabador. Toca Iniciar otra vez.');
            setIsRecording(false);
            return false;
          }
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
        setRecorderError('No se pudo grabar. Toca Iniciar otra vez.');
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
        // Safari: pedir datos y dar un instante antes de stop
        if (recorder.state === 'recording') {
          try {
            recorder.requestData();
          } catch {
            // ignore
          }
          window.setTimeout(() => {
            try {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
              }
            } catch (e) {
              console.warn('Error stopping media recorder:', e);
            }
          }, 80);
        } else {
          recorder.stop();
        }
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
