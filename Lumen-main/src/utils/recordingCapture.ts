/**
 * Captura para grabación.
 * - Preview: nunca se suelta en Iniciar (evita recarga / teleprompter muerto).
 * - Mic: se pide en el gesto de Iniciar y se guarda para el recorder.
 * - Apple: MediaRecorder sobre canvas.captureStream(video) + pista de mic
 *   (addTrack sobre el stream de getUserMedia de cámara deja tomas mudas).
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  isAppleTouchDevice,
} from './cameraStreamStore';

let pendingMicStream: MediaStream | null = null;
let canvasPumpRaf = 0;
let canvasHelperVideo: HTMLVideoElement | null = null;

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

export function getPendingMicStream(): MediaStream | null {
  if (pendingMicStream && isLive(pendingMicStream, 'audio')) return pendingMicStream;
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

function requestMicInGesture(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }
  setAudioSessionPlayAndRecord();
  return navigator.mediaDevices
    .getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }))
    .then((mic) => {
      mic.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      if (!isLive(mic, 'audio')) {
        mic.getTracks().forEach((t) => t.stop());
        throw new Error('NO_AUDIO');
      }
      // Sustituir mic anterior
      if (pendingMicStream && pendingMicStream !== mic) {
        pendingMicStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
      }
      pendingMicStream = mic;
      return mic;
    });
}

/**
 * SÍNCRONO en el onClick de Iniciar.
 * No suelta la cámara. Pide mic en el gesto y lo deja listo para grabar.
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  setAudioSessionPlayAndRecord();
  const shared = getSharedCameraStream();

  if (shared && isLive(shared, 'video')) {
    shared.getVideoTracks().forEach((t) => {
      t.enabled = true;
    });

    // Si el preview ya trae mic live del mismo gUM, úsalo también como pending
    if (isLive(shared, 'audio')) {
      pendingMicStream = new MediaStream(shared.getAudioTracks());
      return Promise.resolve(shared);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return Promise.resolve(shared);
    }

    // Pedir mic YA (gesto). El teleprompter no espera a que falle.
    return requestMicInGesture()
      .then(() => shared)
      .catch(() => shared);
  }

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
      if (isLive(stream, 'audio')) {
        pendingMicStream = new MediaStream(stream.getAudioTracks());
      }
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    })
    .catch(() =>
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => {
          setSharedCameraStream(stream, { stopPrevious: true });
          return requestMicInGesture()
            .then(() => stream)
            .catch(() => stream);
        })
    );
}

export function resumeRecordingAudioContext(): void {
  setAudioSessionPlayAndRecord();
}

export type RecorderSurface = {
  stream: MediaStream;
  stop: () => void;
};

/**
 * Stream para MediaRecorder.
 * Apple: canvas con frames de la cámara + pistas del mic (único camino fiable).
 * Resto: stream de cámara (con mic si ya está).
 */
export async function createRecorderSurface(cameraStream: MediaStream): Promise<RecorderSurface> {
  const videoTracks = cameraStream.getVideoTracks().filter((t) => t.readyState === 'live');
  if (!videoTracks.length) {
    throw new Error('NO_VIDEO');
  }

  let mic = getPendingMicStream();
  if (!mic && isLive(cameraStream, 'audio')) {
    mic = new MediaStream(cameraStream.getAudioTracks());
    pendingMicStream = mic;
  }

  // Escritorio / Android: si ya hay audio en el stream de cámara, usarlo directo
  if (!isAppleTouchDevice()) {
    if (mic && !isLive(cameraStream, 'audio')) {
      mic.getAudioTracks().forEach((t) => {
        try {
          cameraStream.addTrack(t);
        } catch {
          // ignore
        }
      });
    }
    return {
      stream: cameraStream,
      stop: () => {
        // no detener cámara/mic compartidos
      },
    };
  }

  // ——— Apple: canvas + mic ———
  if (!mic || !isLive(mic, 'audio')) {
    // Sin mic: grabar solo video (mejor que romper)
    return {
      stream: new MediaStream(videoTracks),
      stop: () => {},
    };
  }

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('muted', 'true');
  video.srcObject = new MediaStream(videoTracks);
  canvasHelperVideo = video;

  try {
    await video.play();
  } catch (err) {
    console.warn('recorder helper video play:', err);
  }

  // Esperar dimensiones reales
  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) {
      resolve();
      return;
    }
    const t = window.setTimeout(() => resolve(), 800);
    video.onloadedmetadata = () => {
      window.clearTimeout(t);
      resolve();
    };
  });

  const canvas = document.createElement('canvas');
  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      stream: new MediaStream([...videoTracks, ...mic.getAudioTracks()]),
      stop: () => {},
    };
  }

  const pump = () => {
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    canvasPumpRaf = window.requestAnimationFrame(pump);
  };
  pump();

  const fps = 30;
  const canvasStream =
    typeof (canvas as HTMLCanvasElement).captureStream === 'function'
      ? canvas.captureStream(fps)
      : null;

  if (!canvasStream || !canvasStream.getVideoTracks().length) {
    window.cancelAnimationFrame(canvasPumpRaf);
    canvasPumpRaf = 0;
    // Fallback: intentar stream combinado crudo
    return {
      stream: new MediaStream([...videoTracks, ...mic.getAudioTracks()]),
      stop: () => {
        video.pause();
        video.srcObject = null;
        canvasHelperVideo = null;
      },
    };
  }

  mic.getAudioTracks().forEach((t) => {
    t.enabled = true;
    canvasStream.addTrack(t);
  });

  return {
    stream: canvasStream,
    stop: () => {
      window.cancelAnimationFrame(canvasPumpRaf);
      canvasPumpRaf = 0;
      canvasStream.getVideoTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      video.pause();
      video.srcObject = null;
      canvasHelperVideo = null;
      // NO detener mic ni cámara del preview
    },
  };
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
