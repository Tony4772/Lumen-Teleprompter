/**
 * Captura AV para MediaRecorder en todos los dispositivos.
 * Safari/iOS: el mic de getUserMedia a veces no entra al MP4 si no se
 * enruta por Web Audio; por eso hay un wrap opcional.
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  releaseSharedCameraStreamSync,
  isAppleTouchDevice,
} from './cameraStreamStore';

export function isMobileRecordingDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isAppleTouchDevice()) return true;
  if (/Android/i.test(navigator.userAgent)) return true;
  return navigator.maxTouchPoints > 1 && /Mobile|Tablet/i.test(navigator.userAgent);
}

export function isWebKitMediaRecorder(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Chrome iOS también es WebKit
  return (
    isAppleTouchDevice() ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//i.test(navigator.userAgent))
  );
}

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  const webkit = isWebKitMediaRecorder();
  const mp4 = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=mp4a.40.2,avc1.42E01E',
    'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];
  const webm = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8,vorbis',
    'video/webm',
  ];
  const list = webkit ? [...mp4, ...webm] : [...webm, ...mp4];
  for (const t of list) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // ignore
    }
  }
  return '';
}

/** Un solo getUserMedia video+audio. Obligatorio en el gesto del usuario en móvil. */
export async function acquireAvStream(): Promise<MediaStream> {
  releaseSharedCameraStreamSync();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: true,
  });

  stream.getAudioTracks().forEach((t) => {
    t.enabled = true;
  });
  stream.getVideoTracks().forEach((t) => {
    t.enabled = true;
  });

  if (!stream.getVideoTracks().length) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('NO_VIDEO');
  }
  if (!stream.getAudioTracks().length) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('NO_AUDIO');
  }

  setSharedCameraStream(stream, { stopPrevious: true });
  return stream;
}

export type RecorderStreamHandle = {
  /** Stream a pasar a MediaRecorder */
  recordStream: MediaStream;
  /** Stream de cámara (preview); puede ser el mismo */
  cameraStream: MediaStream;
  cleanup: () => void;
};

/**
 * Prepara stream grabable.
 * En WebKit, reinyecta el mic por AudioContext → MediaStreamDestination
 * para que el AAC quede dentro del MP4 (bug conocido de MediaRecorder+mic crudo).
 */
export async function buildRecorderStream(cameraStream: MediaStream): Promise<RecorderStreamHandle> {
  const videoTracks = cameraStream.getVideoTracks().filter((t) => t.readyState === 'live');
  const audioTracks = cameraStream.getAudioTracks().filter((t) => t.readyState === 'live');

  audioTracks.forEach((t) => {
    t.enabled = true;
  });

  if (!videoTracks.length) {
    throw new Error('NO_VIDEO');
  }

  if (!audioTracks.length || !isWebKitMediaRecorder()) {
    return {
      recordStream: cameraStream,
      cameraStream,
      cleanup: () => {},
    };
  }

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const micSource = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
  const dest = ctx.createMediaStreamDestination();

  // Señal mínima para que Safari no trate el track como “muted/silent”
  const osc = ctx.createOscillator();
  const gate = ctx.createGain();
  gate.gain.value = 0.0001;
  osc.connect(gate);
  gate.connect(dest);
  osc.start();

  micSource.connect(dest);

  const processedAudio = dest.stream.getAudioTracks();
  if (!processedAudio.length) {
    try {
      osc.stop();
    } catch {
      // ignore
    }
    void ctx.close();
    return {
      recordStream: cameraStream,
      cameraStream,
      cleanup: () => {},
    };
  }

  processedAudio.forEach((t) => {
    t.enabled = true;
  });

  const recordStream = new MediaStream([...videoTracks, ...processedAudio]);

  return {
    recordStream,
    cameraStream,
    cleanup: () => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
      try {
        void ctx.close();
      } catch {
        // ignore
      }
    },
  };
}

export function getLiveAvStream(): MediaStream | null {
  const s = getSharedCameraStream();
  if (
    s &&
    s.getVideoTracks().some((t) => t.readyState === 'live') &&
    s.getAudioTracks().some((t) => t.readyState === 'live')
  ) {
    return s;
  }
  return null;
}
