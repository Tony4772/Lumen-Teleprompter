import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PrompterSettings, PlaybackStatus, CameraLayout } from '../types';
import { parseScriptContent, ParsedLine } from '../utils/prompterUtils';
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
  Square,
  Film
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
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 70 }); // in px from top-right or similar

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

  // Handle webcam video stream if camera is active
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isCameraEnabled) {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: false 
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.warn);
            setIsCameraReady(true);
          }
        })
        .catch((err) => {
          console.warn('Webcam not accessible:', err);
          setIsCameraReady(false);
          setCameraError('No se pudo acceder a la cámara web. Revisa los permisos del navegador.');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraReady(false);
      setCameraError(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraEnabled]);

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

  // Continuous RAF animation loop for ultra-smooth scrolling
  const lastTimeRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  scrollYRef.current = scrollY;

  useEffect(() => {
    if (playbackStatus !== 'playing') {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const animateScroll = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;

        // Calibrated scroll speed:
        // Reading speed in words per second = settings.wpm / 60.
        // Pixels per second = (wordsPerSec / 7.5) * (fontSize * lineHeight)
        const wordsPerSec = settings.wpm / 60;
        const avgWordsPerLine = 7.5;
        const lineHeightPx = settings.fontSize * settings.lineHeight;
        const pxPerSecond = (wordsPerSec / avgWordsPerLine) * lineHeightPx;

        const nextScroll = scrollYRef.current + pxPerSecond * deltaSec;

        if (containerRef.current) {
          const maxContainerScroll =
            containerRef.current.scrollHeight - containerRef.current.clientHeight;

          if (nextScroll >= maxContainerScroll && maxContainerScroll > 0) {
            // Reached End of Script
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
  }, [playbackStatus, settings.wpm, settings.fontSize, settings.lineHeight, onReachedEnd]);

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

  // Webcam Sub-Component View with framing guides and quick controls
  const renderWebcamSurface = (isFloating = false) => (
    <div
      className={`relative overflow-hidden bg-[#0a0a0a] flex items-center justify-center ${
        isFloating
          ? 'w-full h-full rounded-xs shadow-2xl border-2 border-white/40 touch-none'
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
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover filter contrast-110 brightness-95 ${
          settings.cameraMirror !== false ? 'transform -scale-x-100' : ''
        }`}
      />

      {/* Camera Framing Guides Overlay (Rule of thirds & Eye-level Gaze) */}
      {settings.cameraFramingGuides && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
          {/* Rule of Thirds Vertical Lines */}
          <div className="absolute inset-0 flex justify-between px-[33.3%] pointer-events-none">
            <div className="w-[1px] h-full bg-white/20 border-r border-white/10" />
            <div className="w-[1px] h-full bg-white/20 border-r border-white/10" />
          </div>

          {/* Eye-Level Target Line (Upper Third) */}
          <div className="absolute top-[32%] left-0 right-0 border-t border-dashed border-amber-400/60 z-10 flex items-center justify-between px-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-300 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Eye className="w-2.5 h-2.5 text-amber-400" />
              <span>Nivel de Ojos (Contacto Visual)</span>
            </span>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-75" />
          </div>

          {/* Lower Third Horizontal Line */}
          <div className="absolute top-[66.6%] left-0 right-0 border-t border-white/20" />
        </div>
      )}

      {/* Floating Camera Header Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-auto">
        {/* Live / REC Indicator */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-1.5 bg-red-600 border border-red-400 px-2.5 py-1 rounded-full text-white text-[10px] font-mono font-bold tracking-wider animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)]">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>REC {formatRecTime(recordingSeconds)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full text-white text-[10px] font-mono uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>WEBCAM</span>
            </div>
          )}

          {/* Quick Record/Stop Button directly on camera */}
          {onToggleRecord && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(30);
                onToggleRecord();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                isRecording
                  ? 'bg-white text-red-600 hover:bg-red-50 border border-white'
                  : 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
              }`}
              title={isRecording ? 'Detener y guardar video' : 'Iniciar grabación'}
            >
              {isRecording ? (
                <>
                  <Square className="w-2.5 h-2.5 fill-current text-red-600" />
                  <span>Detener Grabación</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>Grabar</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Quick Camera Action Controls */}
        {onUpdateSettings && (
          <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md border border-white/20 p-1 rounded-full text-white">
            {/* Swap Side (Left <-> Right) */}
            {settings.cameraLayout === 'side-by-side' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  onUpdateSettings({
                    cameraPosition: settings.cameraPosition === 'left' ? 'right' : 'left'
                  });
                }}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Cambiar lado de la cámara (Izquierda ↔ Derecha)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Toggle Framing Guides */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(10);
                onUpdateSettings({
                  cameraFramingGuides: !settings.cameraFramingGuides
                });
              }}
              className={`p-1 rounded-full transition-colors ${
                settings.cameraFramingGuides ? 'bg-amber-400 text-black' : 'hover:bg-white/20 text-white'
              }`}
              title="Alternar guías de encuadre y nivel de ojos"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Mirror */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(10);
                onUpdateSettings({
                  cameraMirror: !(settings.cameraMirror !== false)
                });
              }}
              className={`p-1 rounded-full transition-colors ${
                settings.cameraMirror !== false ? 'bg-white/20 text-white' : 'hover:bg-white/20 text-white/60'
              }`}
              title="Alternar efecto espejo en cámara"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Layout Mode Cycle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(10);
                const layouts: CameraLayout[] = ['side-by-side', 'pip', 'background'];
                const currentIdx = layouts.indexOf(settings.cameraLayout || 'side-by-side');
                const nextLayout = layouts[(currentIdx + 1) % layouts.length];
                onUpdateSettings({ cameraLayout: nextLayout });
              }}
              className={`p-1 rounded-full transition-colors ${
                settings.cameraLayout !== 'side-by-side' ? 'bg-amber-400 text-black' : 'hover:bg-white/20 text-white'
              }`}
              title={`Cambiar diseño: ${settings.cameraLayout}. Clic para alternar entre Dividido, Flotante o Fondo.`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>

            {/* Turn off camera */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(15);
                onUpdateSettings({ cameraOverlay: false });
                if (onSetMode) onSetMode('fullscreen');
              }}
              className="p-1 rounded-full hover:bg-red-500/30 text-white hover:text-red-400 transition-colors"
              title="Cerrar cámara y volver a pantalla completa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Info Pill - More descriptive */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex justify-center pointer-events-none">
        <span className="text-[10px] font-mono font-bold text-white bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-lg">
          {settings.cameraLayout === 'side-by-side' 
            ? 'VISTA DIVIDIDA'
            : settings.cameraLayout === 'pip'
            ? 'VENTANA FLOTANTE (ARRASTRABLE)'
            : 'CÁMARA DE FONDO'}
        </span>
      </div>

      {cameraError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center text-white z-30">
          <VideoOff className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-xs font-mono text-[#AAA]">{cameraError}</p>
        </div>
      )}
    </div>
  );

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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover filter contrast-125 brightness-90 ${
              settings.cameraMirror !== false ? 'transform -scale-x-100' : ''
            }`}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

          {/* Framing Guides for Background mode too */}
          {settings.cameraFramingGuides && (
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
              <div className="absolute inset-0 flex justify-between px-[33.3%] pointer-events-none">
                <div className="w-[1px] h-full bg-white/10 border-r border-white/5" />
                <div className="w-[1px] h-full bg-white/10 border-r border-white/5" />
              </div>
              <div className="absolute top-[32%] left-0 right-0 border-t border-dashed border-amber-400/40 z-10" />
            </div>
          )}
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

      {/* CORE WORKSPACE SURFACE: SIDE-BY-SIDE OR STANDARD */}
      {isCameraEnabled && settings.cameraLayout === 'side-by-side' ? (
        <div className="w-full h-full flex flex-col md:flex-row relative z-10">
          {/* Camera on Left (Default) */}
          {settings.cameraPosition === 'left' ? (
            <>
              <div className="w-full md:w-1/2 h-[35%] md:h-full border-b md:border-b-0 md:border-r border-white/20 relative shrink-0">
                {renderWebcamSurface(false)}
              </div>
              <div className="w-full md:w-1/2 h-[65%] md:h-full relative overflow-hidden">
                {renderPrompterTextSurface()}
              </div>
            </>
          ) : (
            /* Camera on Right */
            <>
              <div className="w-full md:w-1/2 h-[65%] md:h-full relative overflow-hidden order-2 md:order-1">
                {renderPrompterTextSurface()}
              </div>
              <div className="w-full md:w-1/2 h-[35%] md:h-full border-t md:border-t-0 md:border-l border-white/20 relative shrink-0 order-1 md:order-2">
                {renderWebcamSurface(false)}
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

      {/* FLOATING PICTURE-IN-PICTURE (PIP) CAMERA MODE */}
      {isCameraEnabled && settings.cameraLayout === 'pip' && (
        <div
          className="absolute z-30 w-52 sm:w-80 aspect-video shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: `${pipPosition.x}px`,
            top: `${pipPosition.y}px`,
            position: 'absolute'
          }}
        >
          {renderWebcamSurface(true)}
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

      {/* Floating Back to Editor Button (Mobile Only) */}
      {onSwitchToEditor && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic(20);
            onSwitchToEditor();
          }}
          className="md:hidden absolute top-4 left-4 z-40 px-3.5 py-1.5 rounded-full bg-[#121212]/90 backdrop-blur-md text-white border border-[#E0DDD5]/40 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 shadow-editorial active:scale-95 transition-all"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          <span>Editor</span>
        </button>
      )}

      {/* Top Floating Control Bar: Speed Regulator + Quick Webcam Launcher + Recording */}
      {onUpdateSettings && (
        <div 
          className={`absolute z-40 flex items-center gap-2 transition-all ${
            isCameraEnabled && settings.cameraLayout === 'side-by-side'
              ? settings.cameraPosition === 'right'
                ? 'top-[36%] md:top-4 right-3 md:right-1/2 md:mr-4'
                : 'top-[36%] md:top-4 right-3 md:right-4'
              : 'top-4 right-4'
          }`}
        >
          
          {/* Direct Record Video Button */}
          {onToggleRecord && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(30);
                onToggleRecord();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-mono font-bold shadow-editorial transition-all active:scale-95 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                  : 'bg-[#121212]/90 text-white border-[#E0DDD5]/40 hover:bg-red-950/40 hover:text-red-300'
              }`}
              title={isRecording ? 'Detener y guardar video' : 'Iniciar grabación de video'}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{formatRecTime(recordingSeconds)}</span>
                  <span className="text-[9px] uppercase tracking-wider bg-black/40 px-1 py-0.5 rounded-xs">
                    STOP
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>REC</span>
                </>
              )}
            </button>
          )}

          {/* Saved Takes Modal Opener */}
          {takesCount > 0 && onOpenRecordingModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(15);
                onOpenRecordingModal();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#121212]/90 backdrop-blur-md border border-[#E0DDD5]/40 text-white hover:bg-white/20 text-xs font-mono font-bold transition-all shadow-editorial"
              title="Ver tomas de video guardadas"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>{takesCount}</span>
            </button>
          )}

          {/* Quick Webcam Switcher Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(15);
              onUpdateSettings({ 
                cameraOverlay: !isCameraEnabled,
                cameraLayout: settings.cameraLayout || 'side-by-side'
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
