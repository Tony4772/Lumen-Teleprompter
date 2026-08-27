import React from 'react';
import { 
  FileEdit, 
  Tv, 
  Camera, 
  FolderOpen, 
  Heart,
} from 'lucide-react';
import { PrompterMode } from '../types';

interface MobileBottomNavProps {
  currentScreen: 'editor' | 'prompter' | 'library';
  mode: PrompterMode;
  onSetScreen: (screen: 'editor' | 'prompter' | 'library') => void;
  onSetMode: (mode: PrompterMode) => void;
  onOpenLibrary: () => void;
  onOpenDonation?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  mode,
  onSetScreen,
  onSetMode,
  onOpenLibrary,
  onOpenDonation,
}) => {
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignored
      }
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xs transition-all active:scale-95 ${
      active ? 'text-[#121212] font-bold' : 'text-[#888] hover:text-[#121212]'
    }`;

  const iconWrap = (active: boolean) =>
    `p-1.5 rounded-full transition-all ${active ? 'bg-[#121212] text-white shadow-xs' : 'bg-transparent'}`;

  const isReading = currentScreen === 'prompter' && (mode === 'fullscreen' || mode === 'mirror');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F9F7F2]/95 backdrop-blur-md border-t border-[#E0DDD5] px-1 py-1.5 safe-bottom flex items-center justify-around shadow-editorial select-none">
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onSetScreen('editor');
          onSetMode('studio');
        }}
        className={tabClass(currentScreen === 'editor' && mode === 'studio')}
      >
        <div className={iconWrap(currentScreen === 'editor' && mode === 'studio')}>
          <FileEdit className="w-4 h-4" />
        </div>
        <span className="text-[9px] uppercase tracking-wider font-semibold">Editor</span>
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onSetScreen('prompter');
          onSetMode(mode === 'mirror' ? 'mirror' : 'fullscreen');
        }}
        className={tabClass(isReading)}
      >
        <div className={iconWrap(isReading)}>
          <Tv className="w-4 h-4" />
        </div>
        <span className="text-[9px] uppercase tracking-wider font-semibold">Lectura</span>
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onSetScreen('prompter');
          onSetMode('camera');
        }}
        className={tabClass(currentScreen === 'prompter' && mode === 'camera')}
      >
        <div className={iconWrap(currentScreen === 'prompter' && mode === 'camera')}>
          <Camera className="w-4 h-4" />
        </div>
        <span className="text-[9px] uppercase tracking-wider font-semibold">Cámara</span>
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onOpenLibrary();
        }}
        className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xs text-[#888] hover:text-[#121212] active:scale-95 transition-all"
      >
        <div className="p-1.5 rounded-full bg-transparent">
          <FolderOpen className="w-4 h-4" />
        </div>
        <span className="text-[9px] uppercase tracking-wider font-semibold">Docs</span>
      </button>

      {onOpenDonation && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onOpenDonation();
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xs text-red-600 active:scale-95 transition-all"
          title="Donar desde S/ 1"
        >
          <div className="p-1.5 rounded-full bg-red-600 text-white shadow-xs">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <span className="text-[9px] uppercase tracking-wider font-bold">Donar</span>
        </button>
      )}
    </nav>
  );
};
