/**
 * Captura AV. Escritorio: comportamiento restaurado (preview + addTrack mic OK).
 * Móvil: un solo getUserMedia({video,audio}) — addTrack deja tomas mudas en iOS.
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

/**
 * Detecta el mejor formato. Apple: MP4+AAC. Resto: WebM/MP4.
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

const OPTIMAL_AV_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
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

/** Escritorio: con fallbacks (incluye video-only). */
function requestDesktopAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  return navigator.mediaDevices
    .getUserMedia(OPTIMAL_AV_CONSTRAINTS)
    .catch(() => navigator.mediaDevices.getUserMedia(STANDARD_AV_CONSTRAINTS))
    .catch(() => navigator.mediaDevices.getUserMedia(GENERIC_AV_CONSTRAINTS))
    .catch(() =>
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    )
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

/** Móvil: una sola getUserMedia AV. No soltar tracks antes (rompe el permiso en iOS). */
function requestMobileAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  return navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
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
 * CRÍTICO: llamar de forma SÍNCRONA en el onClick (sin await antes).
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  // Si el preview YA tiene cámara viva (caso: página cargada con permiso),
  // reutilizar SIEMPRE. Un segundo getUserMedia en iPhone apaga el vídeo.
  const shared = getSharedCameraStream();
  if (shared && isLive(shared, 'video')) {
    shared.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(shared);
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  if (isMobileDevice()) {
    return requestMobileAvStream();
  }

  // ——— ESCRITORIO (igual que antes de la regresión) ———
  const currentPreview = getSharedCameraStream();
  if (currentPreview && isLive(currentPreview, 'video')) {
    if (isLive(currentPreview, 'audio')) {
      currentPreview.getTracks().forEach((t) => {
        t.enabled = true;
      });
      return Promise.resolve(currentPreview);
    }

    return navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }))
      .then((audioStream) => {
        audioStream.getAudioTracks().forEach((t) => {
          t.enabled = true;
          currentPreview.addTrack(t);
        });
        setSharedCameraStream(currentPreview, { stopPrevious: false });
        return currentPreview;
      })
      .catch(() => currentPreview);
  }

  return requestDesktopAvStream();
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
