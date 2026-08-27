/**
 * Captura AV universal (móvil y escritorio).
 * - Si ya hay video+audio vivos → reutilizar (no apagar preview).
 * - Si falta mic → getUserMedia({video,audio}) en el gesto; solo entonces reemplazar el stream.
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  isAppleTouchDevice,
} from './cameraStreamStore';

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

/**
 * Pedir video+audio. No detener el preview hasta tener el nuevo stream OK.
 */
function requestAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  return navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
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
      // Solo aquí se sustituye el preview (video-only u otro).
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

/**
 * Llamar SÍNCRONO en el onClick de Iniciar.
 * Si ya hay cámara+mic, reutiliza (no vuelve a pedir cámara).
 * Si falta mic, pide solo audio y arma stream AV sin reabrir video.
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  const shared = getSharedCameraStream();

  if (shared && isLive(shared, 'video') && isLive(shared, 'audio')) {
    shared.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(shared);
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  // Ya hay cámara, falta mic → pedir SOLO mic (no volver a pedir cámara).
  if (shared && isLive(shared, 'video') && !isLive(shared, 'audio')) {
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((audioStream) => {
        const audioTracks = audioStream.getAudioTracks();
        if (!audioTracks.some((t) => t.readyState === 'live')) {
          audioStream.getTracks().forEach((t) => t.stop());
          throw new Error('NO_AUDIO');
        }
        audioTracks.forEach((t) => {
          t.enabled = true;
          shared.addTrack(t);
        });
        setSharedCameraStream(shared, { stopPrevious: false });
        return shared;
      });
  }

  // No hay preview aún → pedir ambos.
  return requestAvStream();
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
