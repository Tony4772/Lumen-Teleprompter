/**
 * Regla iPhone: NUNCA soltar/reabrir la cámara en Iniciar (recarga el video y
 * corta el teleprompter). Reutilizar el preview; si falta mic, pedirlo solo.
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

  // En Apple no usar codecs solo-video (deja el archivo mudo).
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

function attachMicToVideo(videoStream: MediaStream, micStream: MediaStream): MediaStream {
  micStream.getAudioTracks().forEach((t) => {
    t.enabled = true;
    const exists = videoStream.getAudioTracks().some((a) => a.id === t.id);
    if (!exists) {
      try {
        videoStream.addTrack(t);
      } catch {
        // ignore
      }
    }
  });
  setSharedCameraStream(videoStream, { stopPrevious: false });
  return videoStream;
}

function requestMicInGesture(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }
  setAudioSessionPlayAndRecord();
  return navigator.mediaDevices
    .getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
}

/**
 * SÍNCRONO en el onClick de Iniciar.
 * Si hay cámara abierta → reutilizar (el teleprompter no espera otra carga de video).
 * Si falta mic → pedirlo en este gesto y unirlo, sin soltar video.
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  const shared = getSharedCameraStream();

  if (shared && isLive(shared, 'video') && isLive(shared, 'audio')) {
    shared.getTracks().forEach((t) => {
      t.enabled = true;
    });
    setAudioSessionPlayAndRecord();
    return Promise.resolve(shared);
  }

  if (shared && isLive(shared, 'video')) {
    shared.getVideoTracks().forEach((t) => {
      t.enabled = true;
    });
    // Pedir mic en el gesto; si falla, igual devolver video para que corra el texto
    if (!navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(shared);
    }
    return requestMicInGesture()
      .then((mic) => attachMicToVideo(shared, mic))
      .catch(() => shared);
  }

  // Sin preview aún
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }
  setAudioSessionPlayAndRecord();
  return navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .catch(() =>
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
    )
    .catch(() =>
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
    )
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

export function resumeRecordingAudioContext(): void {
  setAudioSessionPlayAndRecord();
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
