/** Stream de cámara compartido entre preview y MediaRecorder. */
let sharedCameraStream: MediaStream | null = null;

export const CAMERA_STREAM_EVENT = 'lumen-camera-stream';

export function setSharedCameraStream(stream: MediaStream | null, opts?: { stopPrevious?: boolean }) {
  const prev = sharedCameraStream;
  if (opts?.stopPrevious && prev && prev !== stream) {
    prev.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
  }
  sharedCameraStream = stream;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CAMERA_STREAM_EVENT));
  }
}

export function getSharedCameraStream(): MediaStream | null {
  return sharedCameraStream;
}

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
