/**
 * Captura AV universal (Chrome, Safari, Android, iPhone, escritorio).
 *
 * Regla: MediaRecorder necesita video+audio del MISMO getUserMedia.
 * Si el preview solo tiene cámara, hay que liberarla y pedir AV en el gesto de Iniciar
 * (si no, el navegador no muestra permiso de mic y la toma sale muda).
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  releaseSharedCameraStreamSync,
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

function reopenVideoPreviewOnly(): void {
  if (!navigator.mediaDevices?.getUserMedia) return;
  void navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });
      setSharedCameraStream(stream, { stopPrevious: true });
    })
    .catch(() => {
      // ignore
    });
}

/**
 * Un solo getUserMedia con video+audio (mismo gesto / mismos tracks para MediaRecorder).
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
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

/**
 * Llamar SÍNCRONO en el onClick de Iniciar.
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  const shared = getSharedCameraStream();

  // Solo reutilizar si YA hay mic live (si no, la grabación sale muda).
  if (shared && isLive(shared, 'video') && isLive(shared, 'audio')) {
    shared.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(shared);
  }

  // Preview solo-video: hay que soltarlo en este mismo tick o el OS no pide mic
  // (la cámara sigue “en uso” y getUserMedia AV falla / no muestra micrófono).
  if (shared && isLive(shared, 'video')) {
    releaseSharedCameraStreamSync();
  }

  return requestAvStream().catch((err) => {
    // Si falló el AV, intentar devolver el preview de video para no dejar pantalla negra.
    reopenVideoPreviewOnly();
    throw err;
  });
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
