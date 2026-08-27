/** Stream de cámara compartido entre preview y MediaRecorder. */
let sharedCameraStream: MediaStream | null = null;
/** Si false, PrompterCanvas no debe abrir getUserMedia propio (sesión de grabación). */
let previewCaptureAllowed = true;

export const CAMERA_STREAM_EVENT = 'lumen-camera-stream';

export function setPreviewCaptureAllowed(allowed: boolean) {
  previewCaptureAllowed = allowed;
}

export function isPreviewCaptureAllowed(): boolean {
  return previewCaptureAllowed;
}

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

/** Libera al instante (sin await). Crucial en iPhone: no diluir el gesto del usuario. */
export function releaseSharedCameraStreamSync(): void {
  const prev = sharedCameraStream;
  sharedCameraStream = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CAMERA_STREAM_EVENT));
  }
  if (prev) {
    prev.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
  }
}

/** Libera y opcionalmente espera (solo cuando NO hace falta gesto de usuario). */
export async function releaseSharedCameraStream(waitMs = 350): Promise<void> {
  releaseSharedCameraStreamSync();
  if (waitMs > 0) {
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
