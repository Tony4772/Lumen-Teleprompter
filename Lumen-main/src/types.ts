export interface Script {
  id: string;
  title: string;
  category: string;
  content: string;
  targetWPM: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type PrompterMode = 'studio' | 'fullscreen' | 'mirror' | 'camera';

export type ReaderLineStyle = 'bar' | 'arrows' | 'focus-dim' | 'glow' | 'none';

export type TextColorOption = {
  id: string;
  name: string;
  color: string;
  bg: string;
};

export type CameraLayout = 'side-by-side' | 'pip' | 'background';
export type CameraPosition = 'left' | 'right';

export interface PrompterSettings {
  wpm: number;
  fontSize: number; // 24 to 140 px
  lineHeight: number; // 1.2 to 2.2
  safeMargin: number; // 10% to 40%
  mirrorX: boolean;
  mirrorY: boolean;
  textColor: string;
  bgColor: string;
  readerLineStyle: ReaderLineStyle;
  readerLinePosition: number; // 15% to 75%
  readerLineColor: string;
  countdownSeconds: number; // 0, 3, 5, 10
  cameraOverlay: boolean;
  cameraLayout: CameraLayout; // 'side-by-side' | 'pip' | 'background'
  cameraPosition: CameraPosition; // 'left' | 'right'
  cameraMirror: boolean;
  cameraFramingGuides: boolean;
  cameraOpacity: number; // 0.1 to 0.9
  speechTracking: boolean;
  focusDim: boolean;
  autoHideControls: boolean;
  showWordCount: boolean;
  showTimer: boolean;
  showProgressBar: boolean;
  fontFamily: 'Serif' | 'Inter' | 'JetBrains Mono';
}

export type PlaybackStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'completed';

export interface RecordedTake {
  id: string;
  scriptId?: string;
  scriptTitle?: string;
  url: string;
  blob: Blob;
  durationSeconds: number;
  createdAt: string;
  fileSizeMb: number;
  mimeType: string;
}
