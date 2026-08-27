/**
 * Captura AV sin apagar el preview.
 * - Video ya abierto → no volver a pedir cámara (evita pantalla negra).
 * - Si falta mic → getUserMedia({audio:true}) en el gesto de Iniciar y unir pistas.
 * - En Apple: pasar el mic por AudioContext → MediaStreamDestination (MediaRecorder
 *   a menudo graba mudo con addTrack crudo).
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  isAppleTouchDevice,
} from './cameraStreamStore';

let recordingAudioCtx: AudioContext | null = null;
let keepAliveOsc: OscillatorNode | null = null;

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

/** Crear/reanudar AudioContext DENTRO del gesto del usuario (iOS). */
function unlockAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!recordingAudioCtx || recordingAudioCtx.state === 'closed') {
      recordingAudioCtx = new AC();
      keepAliveOsc = null;
    }
    void recordingAudioCtx.resume();
    return recordingAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Une video vivo + mic. En Apple reencamina el mic por AudioContext.
 * No detiene las pistas de video del preview.
 */
function buildRecorderStream(videoStream: MediaStream, micStream: MediaStream): MediaStream {
  const videoTracks = videoStream.getVideoTracks().filter((t) => t.readyState === 'live');
  const rawAudio = micStream.getAudioTracks().filter((t) => t.readyState === 'live');
  rawAudio.forEach((t) => {
    t.enabled = true;
  });

  let audioTracks: MediaStreamTrack[] = rawAudio;
  const ctx = recordingAudioCtx;

  if (ctx && rawAudio.length > 0) {
    try {
      void ctx.resume();
      const source = ctx.createMediaStreamSource(micStream);
      const dest = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.connect(gain);
      gain.connect(dest);

      // Evita que WebKit mutee el destino si el mic va quieto un momento
      if (!keepAliveOsc) {
        const osc = ctx.createOscillator();
        const silent = ctx.createGain();
        silent.gain.value = 0.0001;
        osc.connect(silent);
        silent.connect(dest);
        osc.start();
        keepAliveOsc = osc;
      }

      const piped = dest.stream.getAudioTracks().filter((t) => t.readyState === 'live');
      if (piped.length > 0) {
        audioTracks = piped;
        audioTracks.forEach((t) => {
          t.enabled = true;
        });
      }
    } catch (err) {
      console.warn('AudioContext pipe failed, using raw mic tracks:', err);
    }
  }

  // Mantener preview: añadir mic crudo al stream compartido sin soltar video
  rawAudio.forEach((t) => {
    const already = videoStream.getAudioTracks().some((a) => a.id === t.id);
    if (!already) {
      try {
        videoStream.addTrack(t);
      } catch {
        // ignore
      }
    }
  });
  setSharedCameraStream(videoStream, { stopPrevious: false });

  return new MediaStream([...videoTracks, ...audioTracks]);
}

function requestMicOnly(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'));
  }
  return navigator.mediaDevices
    .getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
}

function requestAvStream(): Promise<MediaStream> {
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
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
    )
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then((stream) => {
      stream.getTracks().forEach((t) => {
        t.enabled = true;
      });
      if (!isLive(stream, 'video')) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('NO_VIDEO');
      }
      setSharedCameraStream(stream, { stopPrevious: true });
      return stream;
    });
}

/**
 * SÍNCRONO en el onClick de Iniciar.
 * No suelta la cámara. Si falta mic, lo pide solo (gesto → diálogo de mic).
 */
export function beginAvCaptureFromUserGesture(): Promise<MediaStream> {
  // Desbloquear audio en el mismo tick del toque (antes de cualquier await)
  unlockAudioContext();

  const shared = getSharedCameraStream();

  if (shared && isLive(shared, 'video') && isLive(shared, 'audio')) {
    shared.getTracks().forEach((t) => {
      t.enabled = true;
    });
    // En Apple, re-pipear mic existente para que MediaRecorder no quede mudo
    if (isAppleTouchDevice() && recordingAudioCtx) {
      try {
        const micOnly = new MediaStream(shared.getAudioTracks());
        return Promise.resolve(buildRecorderStream(shared, micOnly));
      } catch {
        return Promise.resolve(shared);
      }
    }
    return Promise.resolve(shared);
  }

  // Cámara abierta, sin mic → pedir SOLO mic (no tocar video)
  if (shared && isLive(shared, 'video') && !isLive(shared, 'audio')) {
    shared.getVideoTracks().forEach((t) => {
      t.enabled = true;
    });
    return requestMicOnly().then((micStream) => {
      if (!micStream.getAudioTracks().some((t) => t.readyState === 'live')) {
        micStream.getTracks().forEach((t) => t.stop());
        // Seguir con video para no romper la toma visual
        return shared;
      }
      return buildRecorderStream(shared, micStream);
    });
  }

  return requestAvStream().then((stream) => {
    if (isLive(stream, 'video') && isLive(stream, 'audio') && isAppleTouchDevice() && recordingAudioCtx) {
      try {
        const micOnly = new MediaStream(stream.getAudioTracks());
        return buildRecorderStream(stream, micOnly);
      } catch {
        return stream;
      }
    }
    return stream;
  });
}

/** Reanudar AudioContext al arrancar MediaRecorder (tras countdown). */
export function resumeRecordingAudioContext(): void {
  unlockAudioContext();
}

/** @deprecated */
export async function openCameraAndMic(): Promise<MediaStream> {
  return beginAvCaptureFromUserGesture();
}
