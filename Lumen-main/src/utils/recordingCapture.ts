/**
 * iPhone/WebKit: MediaRecorder solo graba audio si video+mic vienen del MISMO
 * getUserMedia. Pedir mic aparte (addTrack / 2º gUM) = toma muda.
 * Al Iniciar: soltar preview y pedir {video,audio} una sola vez en el gesto.
 * Escritorio: reutilizar preview; si falta mic, añadir audio sin soltar video.
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

  // En Apple NUNCA elegir codecs solo de video (avc1 sin mp4a) → archivo mudo.
  const candidates = apple
    ? [
        'video/mp4',
        'video/mp4;codecs=avc1.42001E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
      ]
    : [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4',
        'video/mp4;codecs=avc1,mp4a.40.2',
      ];

  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // ignore
    }
  }
  return apple ? 'video/mp4' : '';
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

function setAudioSessionPlayAndRecord(): void {
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'play-and-record';
  } catch {
    // ignore
  }
}

/** Un solo getUserMedia con video+audio. Sin fallback a video-only. */
function requestStrictAvStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  setAudioSessionPlayAndRecord();

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
      if (!isLive(stream, 'video') || !isLive(stream, 'audio')) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('NO_AUDIO');
      }
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

function requestDesktopStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }

  const shared = getSharedCameraStream();
  if (shared && isLive(shared, 'video') && isLive(shared, 'audio')) {
    shared.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return Promise.resolve(shared);
  }

  if (shared && isLive(shared, 'video') && !isLive(shared, 'audio')) {
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mic) => {
        mic.getAudioTracks().forEach((t) => {
          t.enabled = true;
          shared.addTrack(t);
        });
        setSharedCameraStream(shared, { stopPrevious: false });
        return shared;
      })
      .catch(() => shared);
  }

  return navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }))
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

/**
 * SÍNCRONO en el onClick de Iniciar.
 * Móvil: siempre un getUserMedia {video,audio} fresco (suelta preview antes).
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  if (!isMobileDevice()) {
    return requestDesktopStream();
  }

  // Liberar cámara del preview ANTES del nuevo gUM (si no, iOS falla / queda mudo).
  if (getSharedCameraStream()) {
    releaseSharedCameraStreamSync();
  }

  return requestStrictAvStream().catch(async (err) => {
    // Si el mic se niega, al menos devolver la cámara al preview
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        setSharedCameraStream(videoOnly, { stopPrevious: true });
      }
    } catch {
      // ignore
    }
    throw err;
  });
}

export function resumeRecordingAudioContext(): void {
  setAudioSessionPlayAndRecord();
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
