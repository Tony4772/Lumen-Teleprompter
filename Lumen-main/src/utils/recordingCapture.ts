/**
 * Captura AV para MediaRecorder (Safari, Chrome iOS/Android, escritorio).
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
  return (
    isAppleTouchDevice() ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//i.test(navigator.userAgent))
  );
}

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  const webkit = isWebKitMediaRecorder();
  // En Safari, codecs muy específicos a veces aceptan isTypeSupported pero generan 0 bytes.
  // Preferir video/mp4 simple en WebKit.
  const mp4 = webkit
    ? ['video/mp4', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2']
    : [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ];
  const webm = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
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

/** Un solo getUserMedia video+audio. */
export async function acquireAvStream(): Promise<MediaStream> {
  // Solo liberar si había preview sin audio (video-only)
  const prev = getSharedCameraStream();
  if (prev && !prev.getAudioTracks().some((t) => t.readyState === 'live')) {
    releaseSharedCameraStreamSync();
  } else if (prev) {
    prev.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
    releaseSharedCameraStreamSync();
  }

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
  recordStream: MediaStream;
  cameraStream: MediaStream;
  cleanup: () => void;
};

/**
 * Stream para MediaRecorder.
 * Safari: usar el MediaStream original de getUserMedia (sin AudioContext).
 * El wrap por Web Audio dejaba tomas de 0 bytes en varios iOS.
 */
export async function buildRecorderStream(cameraStream: MediaStream): Promise<RecorderStreamHandle> {
  const videoTracks = cameraStream.getVideoTracks().filter((t) => t.readyState === 'live');
  if (!videoTracks.length) {
    throw new Error('NO_VIDEO');
  }

  cameraStream.getAudioTracks().forEach((t) => {
    t.enabled = true;
  });

  return {
    recordStream: cameraStream,
    cameraStream,
    cleanup: () => {},
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

export function getLiveVideoStream(): MediaStream | null {
  const s = getSharedCameraStream();
  if (s && s.getVideoTracks().some((t) => t.readyState === 'live')) {
    return s;
  }
  return null;
}

export async function acquireMicOnly(): Promise<MediaStreamTrack[]> {
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  const tracks = mic.getAudioTracks();
  tracks.forEach((t) => {
    t.enabled = true;
  });
  return tracks;
}

export function combineVideoAndAudio(
  videoStream: MediaStream,
  audioTracks: MediaStreamTrack[]
): MediaStream {
  const videoTrack = videoStream.getVideoTracks().find((t) => t.readyState === 'live');
  const tracks: MediaStreamTrack[] = [];
  if (videoTrack) tracks.push(videoTrack);
  audioTracks
    .filter((t) => t.readyState === 'live')
    .forEach((t) => {
      t.enabled = true;
      tracks.push(t);
    });
  return new MediaStream(tracks);
}
