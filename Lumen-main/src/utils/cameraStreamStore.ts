/** Stream de cámara compartido entre preview y MediaRecorder (evita doble getUserMedia en móvil). */
let sharedCameraStream: MediaStream | null = null;

export function setSharedCameraStream(stream: MediaStream | null) {
  sharedCameraStream = stream;
}

export function getSharedCameraStream(): MediaStream | null {
  return sharedCameraStream;
}
