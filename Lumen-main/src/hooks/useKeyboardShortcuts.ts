import { useEffect } from 'react';
import { useStore } from '../store/useStore';

interface ShortcutActions {
  handleTogglePlay: () => void;
  handleRestart: () => void;
  handleNudgeForward: () => void;
  handleNudgeBackward: () => void;
  handleToggleFullscreen: () => void;
  handleToggleVoice: () => void;
  handleToggleRecord: () => void;
}

export const useKeyboardShortcuts = (actions: ShortcutActions) => {
  const store = useStore();
  const {
    updateSettings,
    setSettingsOpen,
    setShortcutsOpen,
    setAIOpen,
    setLibraryOpen
  } = store;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        actions.handleTogglePlay();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        updateSettings({ wpm: Math.min(600, store.settings.wpm + 5) });
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        updateSettings({ wpm: Math.max(10, store.settings.wpm - 5) });
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        actions.handleNudgeBackward();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        actions.handleNudgeForward();
      } else if (e.key === 'r' || e.key === 'R') {
        actions.handleRestart();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        actions.handleToggleRecord();
      } else if (e.key === 'm' || e.key === 'M') {
        updateSettings({ mirrorX: !store.settings.mirrorX });
      } else if (e.key === 'f' || e.key === 'F') {
        actions.handleToggleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        updateSettings({ cameraOverlay: !store.settings.cameraOverlay });
      } else if (e.key === 'v' || e.key === 'V') {
        actions.handleToggleVoice();
      } else if (e.key === '+' || e.key === '=') {
        updateSettings({ fontSize: Math.min(120, store.settings.fontSize + 2) });
      } else if (e.key === '-' || e.key === '_') {
        updateSettings({ fontSize: Math.max(20, store.settings.fontSize - 2) });
      } else if (e.key === 'Escape') {
        setSettingsOpen(false);
        setShortcutsOpen(false);
        setAIOpen(false);
        setLibraryOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, updateSettings, store.settings, setSettingsOpen, setShortcutsOpen, setAIOpen, setLibraryOpen]);
};
