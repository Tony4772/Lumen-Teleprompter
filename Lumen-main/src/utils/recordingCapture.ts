/**
 * Captura AV: un solo getUserMedia({video,audio}).
 * Nunca video-only, nunca addTrack (en iPhone deja tomas mudas).
 * Si ya hay video+audio vivos → reutilizar.
 * Si falta mic → soltar preview y pedir ambos en el mismo gesto.
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  releaseSharedCameraStreamSync,
  isAppleTouchDevice,
} from './cameraStreamStore';

let inflightAv: Promise<MediaStream> | null = null;

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    isAppleTouchDevice() ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

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
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
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
  return tracks.length > 0 && tracks.some((t) => t.readyState === 'live');
}

export function getReadyAvStream(): MediaStream | null {
  const s = getSharedCameraStream();
  if (isLive(s, 'video') && isLive(s, 'audio')) return s;
  return null;
}

/** Pedir video+audio. Sustituye el stream compartido solo si ambos están vivos. */
function requestAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  return navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
    )
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

/**
 * Llamar SÍNCRONO dentro de un gesto (touch/click).
 * Dispara getUserMedia en este mismo tick para que iOS muestre mic.
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  const ready = getReadyAvStream();
  if (ready) {
    ready.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(ready);
  }

  if (inflightAv) return inflightAv;

  // Preview sin mic (o muerto): soltar y pedir cámara+mic juntos.
  // addTrack deja grabaciones mudas en WebKit.
  if (getSharedCameraStream()) {
    releaseSharedCameraStreamSync();
  }

  inflightAv = requestAvStream().finally(() => {
    inflightAv = null;
  });
  return inflightAv;
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
