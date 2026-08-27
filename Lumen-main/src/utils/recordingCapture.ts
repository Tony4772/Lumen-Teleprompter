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

function requestFullAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  return navigator.mediaDevices
    .getUserMedia(OPTIMAL_AV_CONSTRAINTS)
    .catch(() => navigator.mediaDevices.getUserMedia(STANDARD_AV_CONSTRAINTS))
    .catch(() => navigator.mediaDevices.getUserMedia(GENERIC_AV_CONSTRAINTS))
    .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }))
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

  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  // Si ya tenemos preview de cámara activo (video live), solicitamos el micrófono
  // y lo agregamos al stream existente sin reiniciar el sensor de la cámara en hardware.
  const currentPreview = getSharedCameraStream();
  if (currentPreview && isLive(currentPreview, 'video')) {
    if (isLive(currentPreview, 'audio')) {
      currentPreview.getTracks().forEach((t) => {
        t.enabled = true;
      });
      return Promise.resolve(currentPreview);
    }

    const audioPromise = navigator.mediaDevices
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
      .catch(() => {
        // Si el usuario rechazó el micrófono o falló, permitir continuar con el video
        return currentPreview;
      });

    return audioPromise;
  }

  return requestFullAvStream();
}

/** @deprecated usar beginAvCaptureFromUserGesture */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
