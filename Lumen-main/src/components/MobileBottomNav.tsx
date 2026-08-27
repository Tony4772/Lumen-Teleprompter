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
    `flex-1 py-2 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-all active:scale-95 ${
      active ? 'text-[#121212] font-bold' : 'text-[#888]'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F9F7F2]/98 backdrop-blur-md border-t border-[#E0DDD5] px-2 safe-bottom flex items-stretch shadow-editorial select-none">
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onSetScreen('editor');
          onSetMode('studio');
        }}
        className={tabClass(isEditor)}
      >
        <div className={`p-2 rounded-full ${isEditor ? 'bg-[#121212] text-white' : ''}`}>
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
        <div className={`p-2 rounded-full ${isReading && !isMoreOpen ? 'bg-[#121212] text-white' : ''}`}>
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
        <div className={`p-2 rounded-full ${isMoreOpen ? 'bg-[#121212] text-white' : ''}`}>
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold">Menú</span>
      </button>
    </nav>
  );
};
