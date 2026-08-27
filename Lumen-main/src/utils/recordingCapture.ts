/**
 * Captura AV: un getUserMedia({video,audio}) iniciado en el gesto del toque.
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  releaseSharedCameraStreamSync,
  isAppleTouchDevice,
} from './cameraStreamStore';

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const apple = isAppleTouchDevice();
  const candidates = apple
    ? ['video/mp4', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm']
    : [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4',
      ];
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // ignore
    }
  }
  return '';
}

function isLive(stream: MediaStream | null, kind: 'video' | 'audio'): boolean {
  if (!stream) return false;
  const tracks = kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks();
  return tracks.some((t) => t.readyState === 'live');
}

export function getReadyAvStream(): MediaStream | null {
  const s = getSharedCameraStream();
  if (isLive(s, 'video') && isLive(s, 'audio')) return s;
  return null;
}

const AV_CONSTRAINTS: MediaStreamConstraints[] = [
  { video: true, audio: true },
  { video: { facingMode: 'user' }, audio: true },
  { video: { facingMode: { ideal: 'user' } }, audio: { echoCancellation: true } },
];

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

  // Soltar preview video-only YA (sync), luego disparar getUserMedia en el mismo tick
  releaseSharedCameraStreamSync();

  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  // Primera petición en el mismo turno del gesto
  const first = navigator.mediaDevices.getUserMedia(AV_CONSTRAINTS[0]);

  return first
    .catch(() => navigator.mediaDevices.getUserMedia(AV_CONSTRAINTS[1]))
    .catch(() => navigator.mediaDevices.getUserMedia(AV_CONSTRAINTS[2]))
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });
      if (!isLive(stream, 'video')) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('NO_VIDEO');
      }
      if (!isLive(stream, 'audio')) {
        stream.getTracks().forEach((t) => t.stop());
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
