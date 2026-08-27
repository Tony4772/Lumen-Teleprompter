import React from 'react';
import { 
  FileEdit, 
  Tv, 
  FlipHorizontal, 
  Camera, 
  FolderOpen, 
  Sparkles,
  Settings
} from 'lucide-react';
import { PrompterMode, PlaybackStatus } from '../types';

interface MobileBottomNavProps {
  currentScreen: 'editor' | 'prompter' | 'library';
  mode: PrompterMode;
  onSetScreen: (screen: 'editor' | 'prompter' | 'library') => void;
  onSetMode: (mode: PrompterMode) => void;
  playbackStatus: PlaybackStatus;
  onTogglePlay: () => void;
  onOpenAIModal: () => void;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  mode,
  onSetScreen,
  onSetMode,
  playbackStatus,
  onTogglePlay,
  onOpenAIModal,
  onOpenSettings,
  onOpenLibrary,
}) => {
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch (e) {
        // Ignored if not permitted
      }
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F9F7F2]/95 backdrop-blur-md border-t border-[#E0DDD5] px-2 py-1.5 safe-bottom flex items-center justify-around shadow-editorial select-none">
      
      {/* Tab 1: Editor Screen */}
      <button
        onClick={() => {
          triggerHaptic();
          onSetScreen('editor');
          onSetMode('studio');
        }}
        className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xs transition-all active:scale-95 ${
          currentScreen === 'editor' && mode === 'studio'
            ? 'text-[#121212] font-bold'
            : 'text-[#888] hover:text-[#121212]'
        }`}
      >
        <div className={`p-1 rounded-full transition-all ${
          currentScreen === 'editor' && mode === 'studio' ? 'bg-[#121212] text-white shadow-xs' : 'bg-transparent'
        }`}>
          <FileEdit className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Editor</span>
      </button>

      {/* Tab 2: Prompter Pro Screen */}
      <button
        onClick={() => {
          triggerHaptic();
          onSetScreen('prompter');
          onSetMode('fullscreen');
        }}
        className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xs transition-all active:scale-95 ${
          currentScreen === 'prompter' && mode === 'fullscreen'
            ? 'text-[#121212] font-bold'
            : 'text-[#888] hover:text-[#121212]'
        }`}
      >
        <div className={`p-1 rounded-full transition-all ${
          currentScreen === 'prompter' && mode === 'fullscreen' ? 'bg-[#121212] text-white shadow-xs' : 'bg-transparent'
        }`}>
          <Tv className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Prompter</span>
      </button>

      {/* Tab 3: Mirror Mode Screen */}
      <button
        onClick={() => {
          triggerHaptic();
          onSetScreen('prompter');
          onSetMode('mirror');
        }}
        className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xs transition-all active:scale-95 ${
          currentScreen === 'prompter' && mode === 'mirror'
            ? 'text-[#121212] font-bold'
            : 'text-[#888] hover:text-[#121212]'
        }`}
      >
        <div className={`p-1 rounded-full transition-all ${
          currentScreen === 'prompter' && mode === 'mirror' ? 'bg-[#121212] text-white shadow-xs' : 'bg-transparent'
        }`}>
          <FlipHorizontal className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Espejo</span>
      </button>

      {/* Tab 4: Camera Overlay Screen */}
      <button
        onClick={() => {
          triggerHaptic();
          onSetScreen('prompter');
          onSetMode('camera');
        }}
        className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xs transition-all active:scale-95 ${
          currentScreen === 'prompter' && mode === 'camera'
            ? 'text-[#121212] font-bold'
            : 'text-[#888] hover:text-[#121212]'
        }`}
      >
        <div className={`p-1 rounded-full transition-all ${
          currentScreen === 'prompter' && mode === 'camera' ? 'bg-[#121212] text-white shadow-xs' : 'bg-transparent'
        }`}>
          <Camera className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Cámara</span>
      </button>

      {/* Tab 5: Scripts Library Screen */}
      <button
        onClick={() => {
          triggerHaptic();
          onOpenLibrary();
        }}
        className="flex-1 py-1.5 flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xs text-[#888] hover:text-[#121212] active:scale-95 transition-all"
      >
        <div className="p-1 rounded-full bg-transparent">
          <FolderOpen className="w-4 h-4" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Guiones</span>
      </button>
    </nav>
  );
};
