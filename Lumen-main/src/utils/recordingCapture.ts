/**
 * Captura AV. Escritorio: sin cambios de comportamiento.
 * Móvil: UNA sola llamada getUserMedia en el gesto del usuario (Iniciar).
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
 * Detecta el mejor formato. En móvil prioriza MP4 con AAC (pista de audio).
 */
export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const mobile = isMobileDevice();
  const apple = isAppleTouchDevice();

  const mobileCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  const desktopCandidates = apple
    ? [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
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

  const candidates = mobile ? mobileCandidates : desktopCandidates;
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

/** Escritorio: constraints con fallbacks (incluye video-only como último recurso). */
function requestDesktopAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  return navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
    )
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: true }))
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

/**
 * Móvil: exactamente UNA getUserMedia en este tick (gesto).
 * Prohibido: .catch → otra getUserMedia (Safari ya no tiene gesto → NotAllowed falso).
 */
function requestMobileAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  // Solo soltar si es video-only. No matar un stream que ya tiene mic.
  const prev = getSharedCameraStream();
  if (prev && isLive(prev, 'video') && !isLive(prev, 'audio')) {
    releaseSharedCameraStreamSync();
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
 * CRÍTICO: llamar de forma SÍNCRONA en el onClick / touchend (sin setTimeout ni await antes).
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  const existing = getReadyAvStream();
  if (existing) {
    existing.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(existing);
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  if (isMobileDevice()) {
    return requestMobileAvStream();
  }

  // ——— ESCRITORIO (sin cambios de intención) ———
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
        const audioTracks = audioStream.getAudioTracks();
        audioTracks.forEach((t) => {
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
