import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PrompterSettings, PlaybackStatus, CameraLayout } from '../types';
import { parseScriptContent, ParsedLine, countLineScriptWords } from '../utils/prompterUtils';
import { setSharedCameraStream, getSharedCameraStream, CAMERA_STREAM_EVENT } from '../utils/cameraStreamStore';
import { isMobileDevice } from '../utils/recordingCapture';
import { 
  Eye, 
  ArrowRight, 
  Play, 
  Pause, 
  Camera, 
  Gauge, 
  Plus, 
  Minus, 
  RotateCcw, 
  Sliders,
  FlipHorizontal,
  Grid,
  Columns,
  ArrowLeftRight,
  VideoOff,
  X,
  Film,
  PictureInPicture2,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface PrompterCanvasProps {
  content: string;
  settings: PrompterSettings;
  playbackStatus: PlaybackStatus;
  onTogglePlay: () => void;
  onRestart?: () => void;
  onReachedEnd?: () => void;
  onUpdateSettings?: (newSettings: Partial<PrompterSettings>) => void;
  onSetMode?: (mode: any) => void;
  onSwitchToEditor?: () => void;
  onProgressUpdate?: (progress: number, elapsedSeconds: number) => void;
  onScrollToTop?: () => void;
  isMirrorMode?: boolean;
  voiceMatchedWord?: string;
  voiceProgress?: number;
  voiceWordIndex?: number;
  speechTracking?: boolean;
  cameraActive?: boolean;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecord?: () => void;
  onOpenRecordingModal?: () => void;
  takesCount?: number;
}

export const PrompterCanvas: React.FC<PrompterCanvasProps> = ({
  content,
  settings,
  playbackStatus,
  onTogglePlay,
  onRestart,
  onReachedEnd,
  onUpdateSettings,
  onSetMode,
  onSwitchToEditor,
  onProgressUpdate,
  isMirrorMode = false,
  voiceProgress = 0,
  voiceWordIndex = 0,
  voiceMatchedWord,
  speechTracking = false,
  cameraActive = false,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecord,
  onOpenRecordingModal,
  takesCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(1000);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tapFeedback, setTapFeedback] = useState<{ x: number; y: number; type: 'play' | 'pause' | 'restart' } | null>(null);
  const [showCompletedBanner, setShowCompletedBanner] = useState(false);
  const [isSpeedHUDOpen, setIsSpeedHUDOpen] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: 12, y: 56 });

  // Touch gesture tracking for mobile swipe & double tap
  const lastTapTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Dragging state for PiP
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const formatRecTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerHaptic = (duration = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (e) {
        // Ignored
      }
    }
  };

  // Parse lines when content changes
  useEffect(() => {
    setParsedLines(parseScriptContent(content));
  }, [content]);

  // Is camera effectively active?
  const isCameraEnabled = cameraActive || settings.cameraOverlay;

  // Handle webcam video stream and PERSISTENCE across layout changes
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let ownsStream = false;

    const attachToVideo = (s: MediaStream) => {
      const tryAttach = (attempts = 0) => {
        const el = videoRef.current;
        if (!el) {
          if (attempts < 30) {
            requestAnimationFrame(() => tryAttach(attempts + 1));
          }
          return;
        }
        // En móviles, aislar solo pistas de video para el preview
        // para que el OS no atenúe el micrófono de la grabación
        const videoTracks = s.getVideoTracks();
        if (videoTracks.length > 0) {
          el.srcObject = new MediaStream(videoTracks);
        } else {
          el.srcObject = s;
        }
        el.muted = true;
        el.defaultMuted = true;
        el.volume = 0;
        el.playsInline = true;
        el.setAttribute('playsinline', 'true');
        el.setAttribute('muted', 'true');
        el.play().catch(console.warn);
        setIsCameraReady(true);
        setCameraError(null);
      };
      tryAttach();
    };

    const setupCamera = async () => {
      if (!isCameraEnabled) return;

      const existing = getSharedCameraStream();
      if (existing && existing.getVideoTracks().some((t) => t.readyState === 'live')) {
        stream = existing;
        ownsStream = false;
        attachToVideo(existing);
        setCameraError(null);
        return;
      }

      // Móvil: no pedir getUserMedia aquí. Sin gesto = NotAllowed y rompe Iniciar.
      // El preview se enciende cuando Iniciar abre el stream compartido.
      if (isMobileDevice()) {
        setIsCameraReady(false);
        setCameraError(null);
        return;
      }

      try {
        setCameraError(null);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const current = getSharedCameraStream();
        if (
          current &&
          current !== stream &&
          current.getVideoTracks().some((t) => t.readyState === 'live') &&
          current.getAudioTracks().some((t) => t.readyState === 'live')
        ) {
          stream.getTracks().forEach((t) => t.stop());
          stream = current;
          ownsStream = false;
          attachToVideo(current);
          setCameraError(null);
          return;
        }

        ownsStream = true;
        setSharedCameraStream(stream);
        attachToVideo(stream);
      } catch (err) {
        console.warn('Webcam not accessible:', err);
        setIsCameraReady(false);
        const fromRecorder = getSharedCameraStream();
        if (
          fromRecorder &&
          fromRecorder.getVideoTracks().some((t) => t.readyState === 'live')
        ) {
          stream = fromRecorder;
          ownsStream = false;
          attachToVideo(fromRecorder);
          setCameraError(null);
          return;
        }
        setCameraError('No se pudo acceder a la cámara.');
      }
    };

    setupCamera();

    const onExternalStream = () => {
      const s = getSharedCameraStream();
      if (s && s.getVideoTracks().some((t) => t.readyState === 'live')) {
        stream = s;
        ownsStream = false;
        attachToVideo(s);
        setCameraError(null);
      }
    };
    window.addEventListener(CAMERA_STREAM_EVENT, onExternalStream);

    const syncInterval = setInterval(() => {
      if (isCameraEnabled && stream && videoRef.current) {
        const vTracks = stream.getVideoTracks();
        if (vTracks.length > 0 && (!videoRef.current.srcObject || (videoRef.current.srcObject as MediaStream).getVideoTracks()[0] !== vTracks[0])) {
          attachToVideo(stream);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(syncInterval);
      window.removeEventListener(CAMERA_STREAM_EVENT, onExternalStream);
      // Solo detener tracks si este efecto los abrió (no los del grabador)
      if (ownsStream && stream) {
        stream.getTracks().forEach((t) => t.stop());
        if (getSharedCameraStream() === stream) {
          setSharedCameraStream(null);
        }
      }
    };
  }, [isCameraEnabled, settings.cameraLayout]);

  // Recalculate dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current && contentRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;
      const totalScrollable = Math.max(0, contentHeight - containerHeight * 0.4);
      setMaxScroll(totalScrollable);
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions, parsedLines, settings.fontSize, settings.lineHeight, settings.cameraLayout, isCameraEnabled]);

  // Continuous RAF animation loop for ultra-smooth scrolling (WPM mode)
  // Disabled while voice tracking drives the scroll to avoid fighting the mic.
  const lastTimeRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  scrollYRef.current = scrollY;

  useEffect(() => {
    if (playbackStatus !== 'playing' || speechTracking) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const animateScroll = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;

        const wordsPerSec = settings.wpm / 60;
        const avgWordsPerLine = 7.5;
        const lineHeightPx = settings.fontSize * settings.lineHeight;
        const pxPerSecond = (wordsPerSec / avgWordsPerLine) * lineHeightPx;

        const nextScroll = scrollYRef.current + pxPerSecond * deltaSec;

        if (containerRef.current) {
          const maxContainerScroll =
            containerRef.current.scrollHeight - containerRef.current.clientHeight;

          if (nextScroll >= maxContainerScroll && maxContainerScroll > 0) {
            setScrollY(0);
            scrollYRef.current = 0;
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
            setShowCompletedBanner(true);
            triggerHaptic(50);
            setTimeout(() => setShowCompletedBanner(false), 4500);

            if (onReachedEnd) {
              onReachedEnd();
            }
            return;
          }

          containerRef.current.scrollTop = nextScroll;
          setScrollY(nextScroll);
        }
      }

      lastTimeRef.current = time;
      animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playbackStatus, speechTracking, settings.wpm, settings.fontSize, settings.lineHeight, onReachedEnd]);

  // Voice-driven scroll: only move after a real spoken match (never jump to top on activate)
  const lastVoiceScrollIdxRef = useRef(-1);
  useEffect(() => {
    if (!speechTracking) {
      lastVoiceScrollIdxRef.current = -1;
      return;
    }
    if (!containerRef.current) return;

    // Al activar Voz, voiceWordIndex suele ser 0 → no desplazar hasta que haya match real
    if (!voiceMatchedWord) {
      lastVoiceScrollIdxRef.current = voiceWordIndex;
      return;
    }

    if (voiceWordIndex === lastVoiceScrollIdxRef.current) return;
    lastVoiceScrollIdxRef.current = voiceWordIndex;

    const container = containerRef.current;

    let wordsSeen = 0;
    let targetEl: HTMLElement | null = null;

    for (let i = 0; i < parsedLines.length; i++) {
      const line = parsedLines[i];
      if (line.type === 'cue' || !line.cleanText?.trim()) continue;
      const lineWords = countLineScriptWords(line.cleanText);
      if (lineWords === 0) continue;
      const lineEnd = wordsSeen + lineWords;
      if (voiceWordIndex >= wordsSeen && voiceWordIndex < lineEnd) {
        targetEl = container.querySelector(`[data-line-id="${line.id}"]`);
        break;
      }
      wordsSeen = lineEnd;
      targetEl = container.querySelector(`[data-line-id="${line.id}"]`);
    }

    if (!targetEl) {
      const maxScrollable = Math.max(0, container.scrollHeight - container.clientHeight);
      const target = voiceProgress * maxScrollable;
      container.scrollTop = target;
      setScrollY(target);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const readerY = (container.clientHeight * settings.readerLinePosition) / 100;
    const elementOffsetInContent =
      targetRect.top - containerRect.top + container.scrollTop;
    const nextScroll = Math.max(0, elementOffsetInContent - readerY + targetRect.height / 2);

    container.scrollTop = nextScroll;
    setScrollY(nextScroll);
  }, [
    speechTracking,
    voiceWordIndex,
    voiceProgress,
    voiceMatchedWord,
    parsedLines,
    settings.readerLinePosition,
  ]);

  // Handle scroll and active line tracking
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop;
    setScrollY(currentY);

    if (onProgressUpdate && containerRef.current) {
      const scrollable =
        containerRef.current.scrollHeight - containerRef.current.clientHeight;
      const progress = scrollable > 0 ? (currentY / scrollable) * 100 : 0;
      const wordsPerSec = settings.wpm / 60;
      const totalWords = parsedLines.reduce(
        (acc, l) => acc + (l.cleanText ? l.cleanText.split(/\s+/).length : 0),
        0
      );
      const elapsed = (progress / 100) * (totalWords / Math.max(1, wordsPerSec));
      onProgressUpdate(progress, elapsed);
    }

    if (containerRef.current) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const targetY =
        containerTop +
        (containerRef.current.clientHeight * settings.readerLinePosition) / 100;

      let closestIdx = 0;
      let minDistance = Infinity;

      const lineElements =
        containerRef.current.querySelectorAll('p[data-line-id], h2[data-line-id]');

      lineElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const lineCenter = rect.top + rect.height / 2;
        const distance = Math.abs(lineCenter - targetY);

        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = index;
        }
      });

      setActiveLineIndex(closestIdx);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect tap vs swipe
    const isTap = Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && deltaTime < 300;

    if (isTap) {
      const now = Date.now();
      const doubleTapDelay = 350;

      if (now - lastTapTimeRef.current < doubleTapDelay) {
        // Double tap: Restart from top
        if (onRestart) {
          triggerHaptic(40);
          onRestart();
          setTapFeedback({ x: touch.clientX, y: touch.clientY, type: 'restart' });
          setTimeout(() => setTapFeedback(null), 600);
        }
        lastTapTimeRef.current = 0;
      } else {
        // Single tap: Toggle Play / Pause
        lastTapTimeRef.current = now;
        setTimeout(() => {
          if (lastTapTimeRef.current === now) {
            triggerHaptic(20);
            onTogglePlay();
            setTapFeedback({
              x: touch.clientX,
              y: touch.clientY,
              type: playbackStatus === 'playing' ? 'pause' : 'play',
            });
            setTimeout(() => setTapFeedback(null), 600);
          }
        }, doubleTapDelay);
      }
    } else {
      // Horizontal swipe to quickly adjust speed
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 40 && onUpdateSettings) {
        if (deltaX > 0) {
          // Swipe Right: Increase speed
          triggerHaptic(15);
          onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) });
        } else {
          // Swipe Left: Decrease speed
          triggerHaptic(15);
          onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) });
        }
      }
    }

    touchStartRef.current = null;
  };

  const isMirroredX = isMirrorMode || settings.mirrorX;
  const isMirroredY = settings.mirrorY;

  const layoutOptions: { id: CameraLayout; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: 'pip', label: 'Flotante', hint: 'Ventana arrastrable', icon: <PictureInPicture2 className="w-3.5 h-3.5" /> },
    { id: 'side-by-side', label: 'Dividido', hint: 'Mitad y mitad', icon: <Columns className="w-3.5 h-3.5" /> },
    { id: 'background', label: 'Fondo', hint: 'Detrás del texto', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  // Webcam surface: video + guides. Layout switching lives in the always-visible bar below.
  const renderWebcamSurface = (layout: CameraLayout) => {
    const isFloating = layout === 'pip';
    const isBackground = layout === 'background';

    return (
      <div
        className={`relative overflow-hidden bg-[#0a0a0a] flex items-center justify-center ${
          isFloating
            ? 'w-full h-full rounded-md shadow-2xl border-2 border-white/50 touch-none'
            : 'w-full h-full'
        }`}
        onPointerDown={(e) => {
          if (!isFloating) return;
          e.stopPropagation();
          isDraggingRef.current = true;
          const rect = e.currentTarget.getBoundingClientRect();
          dragOffsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!isFloating || !isDraggingRef.current || !mainContainerRef.current) return;
          e.stopPropagation();
          const canvasRect = mainContainerRef.current.getBoundingClientRect();
          setPipPosition({
            x: e.clientX - canvasRect.left - dragOffsetRef.current.x,
            y: e.clientY - canvasRect.top - dragOffsetRef.current.y,
          });
        }}
        onPointerUp={(e) => {
          if (!isFloating) return;
          e.stopPropagation();
          isDraggingRef.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover filter contrast-110 brightness-95 ${
            settings.cameraMirror !== false ? 'transform -scale-x-100' : ''
          }`}
        />

        {isBackground && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />}

        {settings.cameraFramingGuides && !isBackground && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 flex justify-between px-[33.3%]">
              <div className="w-[1px] h-full bg-white/20" />
              <div className="w-[1px] h-full bg-white/20" />
            </div>
            <div className="absolute top-[32%] left-0 right-0 border-t border-dashed border-amber-400/60 flex items-center px-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-amber-300 bg-black/50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                Nivel ojos
              </span>
            </div>
            <div className="absolute top-[66.6%] left-0 right-0 border-t border-white/20" />
          </div>
        )}

        {/* Compact chrome only on desktop surfaces — mobile keeps video clean */}
        {!isBackground && onUpdateSettings && (
          <div className="hidden md:flex absolute top-2 left-2 right-2 z-20 items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full text-white text-[9px] font-mono font-bold tracking-wider">
              {isRecording ? (
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                </span>
              ) : isFloating ? (
                <span className="opacity-80">Arrastra</span>
              ) : (
                <span className="opacity-70">Cámara</span>
              )}
            </div>

            <div className="flex items-center gap-0.5 bg-black/90 backdrop-blur-xl border border-white/30 p-1 rounded-md text-white shadow-xl">
              {layout === 'side-by-side' && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(10);
                    onUpdateSettings({ cameraPosition: settings.cameraPosition === 'left' ? 'right' : 'left' });
                  }}
                  className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xs hover:bg-white/20"
                  title="Cambiar lado"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="text-[7px] uppercase font-bold">Lado</span>
                </button>
              )}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  onUpdateSettings({ cameraFramingGuides: !settings.cameraFramingGuides });
                }}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xs ${settings.cameraFramingGuides ? 'bg-amber-500 text-black' : 'hover:bg-white/20'}`}
                title="Guías de encuadre"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="text-[7px] uppercase font-bold">Guías</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  onUpdateSettings({ cameraMirror: !(settings.cameraMirror !== false) });
                }}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xs ${settings.cameraMirror !== false ? 'bg-white/25' : 'hover:bg-white/20'}`}
                title="Espejo de cámara"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="text-[7px] uppercase font-bold">Espejo</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(15);
                  onUpdateSettings({ cameraOverlay: false });
                  if (onSetMode) onSetMode('fullscreen');
                }}
                className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xs bg-red-600 hover:bg-red-500"
                title="Cerrar cámara"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[7px] uppercase font-bold">Cerrar</span>
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center text-white z-30">
            <VideoOff className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-[10px] font-mono text-[#AAA]">{cameraError}</p>
          </div>
        )}
      </div>
    );
  };

  // Main Scrolling Prompter Text Surface
  const renderPrompterTextSurface = () => (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onClick={onTogglePlay}
      className={`w-full h-full overflow-y-auto no-scrollbar cursor-pointer z-10 relative ${
        isMirroredX && isMirroredY
          ? 'mirror-both'
          : isMirroredX
          ? 'mirror-x'
          : isMirroredY
          ? 'mirror-y'
          : ''
      }`}
      style={{
        paddingLeft: isCameraEnabled && settings.cameraLayout === 'side-by-side' ? '6%' : `${settings.safeMargin}%`,
        paddingRight: isCameraEnabled && settings.cameraLayout === 'side-by-side' ? '6%' : `${settings.safeMargin}%`,
        paddingTop: `${settings.readerLinePosition}vh`,
        paddingBottom: '60vh',
      }}
    >
      <div ref={contentRef} className="flex flex-col gap-6 text-center">
        {parsedLines.map((line, idx) => {
          const isActive = idx === activeLineIndex;

          if (line.type === 'cue') {
            return (
              <div
                key={line.id}
                data-line-id={line.id}
                className="my-4 flex justify-center items-center"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold tracking-widest uppercase bg-[#121212] text-white border border-[#E0DDD5] shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {line.cueText}
                </span>
              </div>
            );
          }

          if (line.type === 'heading') {
            return (
              <h2
                key={line.id}
                data-line-id={line.id}
                className="font-serif italic font-bold tracking-tight text-center mt-8 mb-4 border-b border-current/20 pb-2"
                style={{
                  fontSize: `${Math.max(26, settings.fontSize * 1.1)}px`,
                  lineHeight: settings.lineHeight,
                  color: settings.textColor || '#ffffff',
                }}
              >
                {line.cleanText}
              </h2>
            );
          }

          if (!line.cleanText) {
            return <div key={line.id} className="h-6" />;
          }

          return (
            <p
              key={line.id}
              data-line-id={line.id}
              className={`transition-all duration-200 tracking-tight font-medium ${
                settings.focusDim && !isActive
                  ? 'opacity-35 scale-[0.98]'
                  : 'opacity-100 scale-100'
              }`}
              style={{
                fontSize: `${isCameraEnabled && settings.cameraLayout === 'side-by-side' ? Math.min(settings.fontSize, 52) : settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                color: settings.textColor || '#ffffff',
                fontFamily:
                  settings.fontFamily === 'JetBrains Mono'
                    ? 'var(--font-mono)'
                    : settings.fontFamily === 'Inter'
                    ? 'var(--font-sans)'
                    : 'var(--font-serif)',
              }}
            >
              {line.cleanText}
            </p>
          );
        })}
      </div>
    </div>
  );

  return (
    <div 
      ref={mainContainerRef}
      className="relative w-full h-full overflow-hidden flex flex-col justify-center items-center select-none touch-manipulation"
      style={{ backgroundColor: settings.bgColor || '#000000' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* BACKGROUND CAMERA MODE (if background layout selected) */}
      {isCameraEnabled && settings.cameraLayout === 'background' && (
        <div 
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center"
          style={{ opacity: settings.cameraOpacity }}
        >
          {renderWebcamSurface('background')}
        </div>
      )}

      {/* Reader Line Indicator Overlay (High-visibility marker) */}
      {settings.readerLineStyle !== 'none' && (
        <div 
          className={`absolute left-0 right-0 pointer-events-none z-20 flex items-center transition-all duration-150 ${
            isCameraEnabled && settings.cameraLayout === 'side-by-side'
              ? settings.cameraPosition === 'left'
                ? 'md:left-1/2 left-0'
                : 'md:right-1/2 right-0'
              : ''
          }`}
          style={{ top: `${settings.readerLinePosition}%` }}
        >
          {/* Left Arrow Cue */}
          <div className="pl-3 sm:pl-6 flex items-center gap-1.5">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center shadow-xs"
              style={{ backgroundColor: settings.readerLineColor || '#121212' }}
            >
              <ArrowRight className="w-3 h-3 text-white stroke-[2.5]" />
            </div>
            <div 
              className="hidden sm:block text-[10px] font-mono font-bold tracking-widest uppercase"
              style={{ color: settings.readerLineColor || '#121212' }}
            >
              FOCO
            </div>
          </div>

          {/* Reader Bar Line */}
          {settings.readerLineStyle === 'bar' && (
            <div 
              className="flex-1 mx-4 h-[2px] opacity-75"
              style={{ backgroundColor: settings.readerLineColor || '#121212' }}
            />
          )}

          {/* Reader Glow Highlight Band */}
          {settings.readerLineStyle === 'glow' && (
            <div 
              className="flex-1 mx-2 h-14 opacity-15 border-y pointer-events-none"
              style={{ 
                backgroundColor: settings.readerLineColor || '#121212',
                borderColor: settings.readerLineColor || '#121212',
              }}
            />
          )}

          {/* Right Arrow Cue */}
          <div className="pr-3 sm:pr-6">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: settings.readerLineColor || '#121212' }}
            />
          </div>
        </div>
      )}

      {/* CORE WORKSPACE: side-by-side — on mobile use vertical camera column (portrait), desktop half/half */}
      {isCameraEnabled && settings.cameraLayout === 'side-by-side' ? (
        <div className="w-full h-full flex flex-row relative z-10">
          {settings.cameraPosition === 'left' ? (
            <>
              <div className="w-[38%] md:w-1/2 h-full border-r border-white/20 relative shrink-0">
                {renderWebcamSurface('side-by-side')}
              </div>
              <div className="flex-1 h-full relative overflow-hidden">
                {renderPrompterTextSurface()}
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 h-full relative overflow-hidden order-1">
                {renderPrompterTextSurface()}
              </div>
              <div className="w-[38%] md:w-1/2 h-full border-l border-white/20 relative shrink-0 order-2">
                {renderWebcamSurface('side-by-side')}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Standard Single Prompter Surface */
        <div className="w-full h-full relative z-10">
          {renderPrompterTextSurface()}
        </div>
      )}

      {/* FLOATING PICTURE-IN-PICTURE — portrait on phone, landscape on desktop */}
      {isCameraEnabled && settings.cameraLayout === 'pip' && (
        <div
          className="absolute z-30 w-[7.25rem] aspect-[9/16] sm:w-40 sm:aspect-[9/16] md:w-80 md:aspect-video shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-md overflow-hidden"
          style={{
            left: `${pipPosition.x}px`,
            top: `${pipPosition.y}px`,
            position: 'absolute'
          }}
        >
          {renderWebcamSurface('pip')}
        </div>
      )}

      {/* Camera layout switcher — desktop only (on mobile: Menú → Vista de cámara) */}
      {isCameraEnabled && onUpdateSettings && (
        <div
          className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto px-2 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#121212]/95 backdrop-blur-xl border border-white/25 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2 pt-0.5">
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/60 font-bold">
                Vista de cámara
              </span>
              {settings.cameraLayout === 'background' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    onUpdateSettings({ cameraOverlay: false });
                    if (onSetMode) onSetMode('fullscreen');
                  }}
                  className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-300 hover:text-red-200 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cerrar
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {layoutOptions.map((opt) => {
                const active = (settings.cameraLayout || 'pip') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      onUpdateSettings({ cameraLayout: opt.id, cameraOverlay: true });
                    }}
                    className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-all ${
                      active
                        ? 'bg-amber-400 text-black shadow-md'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={opt.hint}
                  >
                    {opt.icon}
                    <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
                    <span className={`text-[8px] leading-tight ${active ? 'text-black/70' : 'text-white/50'}`}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Progress Bar */}
      {settings.showProgressBar && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#121212]/20 z-30 pointer-events-none">
          <div
            className="h-full bg-[#121212] transition-all duration-75"
            style={{
              width: `${
                containerRef.current &&
                containerRef.current.scrollHeight > containerRef.current.clientHeight
                  ? (scrollY /
                      (containerRef.current.scrollHeight -
                        containerRef.current.clientHeight)) *
                    100
                  : 0
              }%`,
            }}
          />
        </div>
      )}

      {/* Visual Tap Feedback Indicator */}
      {tapFeedback && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 animate-ping"
          style={{ left: tapFeedback.x, top: tapFeedback.y }}
        >
          <div className="w-16 h-16 rounded-full bg-white/40 border border-white flex items-center justify-center shadow-lg">
            {tapFeedback.type === 'play' && <Play className="w-6 h-6 text-white fill-current" />}
            {tapFeedback.type === 'pause' && <Pause className="w-6 h-6 text-white fill-current" />}
            {tapFeedback.type === 'restart' && <span className="text-xs font-mono font-bold text-white uppercase">REINICIO</span>}
          </div>
        </div>
      )}

      {/* Completion & Automatic Reset Notification Banner */}
      {showCompletedBanner && (
        <div className="absolute inset-x-0 top-16 z-50 flex justify-center items-center px-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
          <div className="px-6 py-3 rounded-full bg-white text-[#121212] border-2 border-[#121212] shadow-editorial-lg flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#121212] text-white flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold font-serif italic text-[#121212]">
                ¡Fin de lectura alcanzado!
              </span>
              <span className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
                Texto restablecido automáticamente al inicio
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Back to Editor — removed on mobile (bottom nav has Editor) */}

      {/* Top Floating Control Bar — desktop only; mobile uses bottom controls + Menú */}
      {onUpdateSettings && (
        <div 
          className={`hidden md:flex absolute z-40 items-center gap-2 transition-all ${
            isCameraEnabled && settings.cameraLayout === 'side-by-side'
              ? settings.cameraPosition === 'right'
                ? 'top-4 right-1/2 mr-4'
                : 'top-4 right-4'
              : 'top-4 right-4'
          }`}
        >
          
          {/* Saved Takes Modal Opener (grabación unida al botón Play) */}
          {takesCount > 0 && onOpenRecordingModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(15);
                onOpenRecordingModal();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#121212]/90 backdrop-blur-md border border-[#E0DDD5]/40 text-white hover:bg-white/20 text-xs font-mono font-bold transition-all shadow-editorial"
              title="Ver o eliminar tomas (toca aquí)"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>{takesCount}</span>
              <Trash2 className="w-3 h-3 text-white/70" />
            </button>
          )}

          {/* Quick Webcam Switcher Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(15);
              onUpdateSettings({ 
                cameraOverlay: !isCameraEnabled,
                cameraLayout: settings.cameraLayout || 'pip'
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-mono font-bold shadow-editorial transition-all ${
              isCameraEnabled
                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                : 'bg-[#121212]/90 text-white border-[#E0DDD5]/40 hover:bg-white/20'
            }`}
            title="Activar o desactivar cámara web al lado del teleprómpter"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCameraEnabled ? 'Cámara Activa' : 'Cámara'}</span>
          </button>

          {/* Main Speed Controller Pill */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-[#121212]/90 backdrop-blur-md border border-[#E0DDD5]/40 px-2.5 py-1.5 rounded-full shadow-editorial transition-all"
          >
            <div className="flex items-center gap-1 text-[#F9F7F2] font-mono text-xs font-bold pl-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.wpm}</span>
              <span className="text-[9px] uppercase tracking-widest text-[#999] hidden xs:inline">WPM</span>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center gap-1 ml-1 border-l border-white/20 pl-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(15);
                  onUpdateSettings({ wpm: Math.max(10, settings.wpm - 5) });
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center font-bold text-xs active:scale-90 transition-colors"
                title="Reducir velocidad (-5 WPM)"
              >
                <Minus className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(15);
                  onUpdateSettings({ wpm: Math.min(320, settings.wpm + 5) });
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center font-bold text-xs active:scale-90 transition-colors"
                title="Aumentar velocidad (+5 WPM)"
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* Toggle Slider Drawer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  setIsSpeedHUDOpen(!isSpeedHUDOpen);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isSpeedHUDOpen ? 'bg-amber-400 text-[#121212]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Ajustes avanzados de velocidad"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Speed Selector Dropdown HUD */}
      {isSpeedHUDOpen && onUpdateSettings && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-40 w-80 max-w-[calc(100vw-2rem)] bg-[#121212]/95 backdrop-blur-xl border border-white/20 rounded-xs p-4 shadow-editorial-lg text-white flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isCameraEnabled && settings.cameraLayout === 'side-by-side'
              ? settings.cameraPosition === 'right'
                ? 'top-[40%] md:top-16 right-3 md:right-1/2 md:mr-4'
                : 'top-[40%] md:top-16 right-3 md:right-4'
              : 'top-16 right-4'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#AAA] flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Regulador de Cadencia</span>
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">{settings.wpm} WPM</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min="10"
              max="320"
              step="5"
              value={settings.wpm}
              onChange={(e) => onUpdateSettings({ wpm: Number(e.target.value) })}
              className="w-full h-2 bg-white/20 rounded-xs appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[9px] font-mono text-[#888]">
              <span>10 WPM (Ultra Lento)</span>
              <span>120 WPM (Normal)</span>
              <span>320 WPM (Rápido)</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 pt-1">
            {[
              { label: 'Ultra', wpm: 20 },
              { label: 'Lento', wpm: 50 },
              { label: 'Pausado', wpm: 90 },
              { label: 'Normal', wpm: 130 },
              { label: 'Rápido', wpm: 180 },
            ].map((preset) => (
              <button
                key={preset.wpm}
                onClick={() => {
                  triggerHaptic(15);
                  onUpdateSettings({ wpm: preset.wpm });
                }}
                className={`py-1.5 rounded-xs font-mono text-[10px] flex flex-col items-center justify-center transition-all ${
                  settings.wpm === preset.wpm
                    ? 'bg-amber-400 text-black font-bold shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <span>{preset.wpm}</span>
                <span className="text-[7px] opacity-75 truncate max-w-full">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
