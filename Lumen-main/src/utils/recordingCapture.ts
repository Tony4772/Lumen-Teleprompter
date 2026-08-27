/**
 * Captura AV optimizada para navegadores móviles y de escritorio.
 * Inicia getUserMedia({video, audio}) bajo el gesto táctil del usuario.
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  releaseSharedCameraStreamSync,
  isAppleTouchDevice,
} from './cameraStreamStore';

/**
 * Detecta el mejor formato de contenedor y códec soportado por el navegador,
 * priorizando MP4 compatible con galerías móviles/WhatsApp y WebM como fallback.
 */
export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const apple = isAppleTouchDevice();
  const candidates = apple
    ? [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm',
      ]
    : [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=opus',
        'video/webm',
      ];

  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // ignore unsupported codec
    }
  }
  return '';
}

function isLive(stream: MediaStream | null, kind: 'video' | 'audio'): boolean {
  if (!stream) return false;
  const tracks = kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks();
  return tracks.length > 0 && tracks.some((t) => t.readyState === 'live');
}

export function getReadyAvStream(): MediaStream | null {
  const s = getSharedCameraStream();
  if (isLive(s, 'video') && isLive(s, 'audio')) return s;
  return null;
}

const OPTIMAL_AV_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

const STANDARD_AV_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: 'user' },
  audio: true,
};

const GENERIC_AV_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: true,
};

/**
 * Fallback para móviles no-Apple donde solicitar audio + video simultáneamente falla
 * debido a bloqueos de hardware simultáneos.
 */
async function captureSplitStreams(): Promise<MediaStream> {
  if (isAppleTouchDevice()) {
    // Safari iOS no permite MediaRecorder con streams sintéticos de distintas llamadas
    throw new Error('SPLIT_STREAM_UNSUPPORTED_ON_IOS');
  }

  const videoStream = await navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 } },
    })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
    )
    .catch(() =>
      navigator.mediaDevices.getUserMedia({
        video: true,
      })
    );

  let audioStream: MediaStream;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioStream.getAudioTracks(),
  ]);

  return combined;
}

/**
 * CRÍTICO: llamar esto de forma SÍNCRONA en el onClick/onTouchEnd (sin await antes).
 * Devuelve la Promise de getUserMedia ya disparada bajo el gesto del usuario.
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  const existing = getReadyAvStream();
  if (existing) {
    existing.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(existing);
  }

  // Soltar preview video-only de inmediato de forma síncrona
  releaseSharedCameraStreamSync();

  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  // Primera petición en el mismo turno síncrono del gesto
  const first = navigator.mediaDevices.getUserMedia(OPTIMAL_AV_CONSTRAINTS);

  return first
    .catch(() => navigator.mediaDevices.getUserMedia(STANDARD_AV_CONSTRAINTS))
    .catch(() => navigator.mediaDevices.getUserMedia(GENERIC_AV_CONSTRAINTS))
    .catch(() => captureSplitStreams())
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });

      if (!isLive(stream, 'video')) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
        throw new Error('NO_VIDEO');
      }

      if (!isLive(stream, 'audio')) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
        throw new Error('NO_AUDIO');
      }

      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

/** @deprecated usar beginAvCaptureFromUserGesture */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
