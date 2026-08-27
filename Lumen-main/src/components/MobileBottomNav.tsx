import React from 'react';
import { FileEdit, Tv, Menu } from 'lucide-react';
import { PrompterMode } from '../types';

interface MobileBottomNavProps {
  currentScreen: 'editor' | 'prompter' | 'library';
  mode: PrompterMode;
  onSetScreen: (screen: 'editor' | 'prompter' | 'library') => void;
  onSetMode: (mode: PrompterMode) => void;
  onOpenMore: () => void;
  isMoreOpen?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  mode,
  onSetScreen,
  onSetMode,
  onOpenMore,
  isMoreOpen = false,
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

  const isEditor = currentScreen === 'editor' && mode === 'studio';
  const isReading = currentScreen === 'prompter';

  const tabClass = (active: boolean) =>
    `flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 min-h-[52px] transition-all active:scale-95 ${
      active ? 'text-[#121212] font-bold' : 'text-[#888]'
    }`;

  return (
    <nav className="flex w-full items-stretch border-t border-[#E0DDD5] bg-[#F9F7F2] px-1 select-none">
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onSetScreen('editor');
          onSetMode('studio');
        }}
        className={tabClass(isEditor)}
      >
        <div className={`p-1.5 rounded-full ${isEditor ? 'bg-[#121212] text-white' : ''}`}>
          <FileEdit className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Editor</span>
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onSetScreen('prompter');
          onSetMode(mode === 'mirror' ? 'mirror' : 'fullscreen');
        }}
        className={tabClass(isReading && !isMoreOpen)}
      >
        <div className={`p-1.5 rounded-full ${isReading && !isMoreOpen ? 'bg-[#121212] text-white' : ''}`}>
          <Tv className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Lectura</span>
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onOpenMore();
        }}
        className={tabClass(isMoreOpen)}
      >
        <div className={`p-1.5 rounded-full ${isMoreOpen ? 'bg-[#121212] text-white' : ''}`}>
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Menú</span>
      </button>
    </nav>
  );
};
