/**
 * Un solo camino de captura: getUserMedia({ video, audio }) en el gesto del usuario.
 * Ese mismo MediaStream se usa para preview y MediaRecorder.
 */
import {
  getSharedCameraStream,
  setSharedCameraStream,
  releaseSharedCameraStreamSync,
  isAppleTouchDevice,
} from './cameraStreamStore';

export function isAppleOrMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isAppleTouchDevice()) return true;
  if (/Android/i.test(navigator.userAgent)) return true;
  return false;
}

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const apple = isAppleTouchDevice();
  const candidates = apple
    ? ['video/mp4', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm']
    : [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
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
  return tracks.some((t) => t.readyState === 'live');
}

export function getReadyAvStream(): MediaStream | null {
  const s = getSharedCameraStream();
  if (isLive(s, 'video') && isLive(s, 'audio')) return s;
  return null;
}

/**
 * Abre cámara + mic juntos. Llamar SOLO dentro del toque Iniciar.
 * Si ya hay un stream AV vivo, lo reutiliza.
 */
export async function openCameraAndMic(): Promise<MediaStream> {
  const existing = getReadyAvStream();
  if (existing) {
    existing.getTracks().forEach((t) => {
      t.enabled = true;
    });
    return existing;
  }

  // Liberar preview video-only que bloquearía el mic en el mismo dispositivo
  releaseSharedCameraStreamSync();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: true,
  });

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
}
