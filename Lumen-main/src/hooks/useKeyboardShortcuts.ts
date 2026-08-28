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
  // Use granular selectors for actions
  const updateSettings = useStore(s => s.updateSettings);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const setShortcutsOpen = useStore(s => s.setShortcutsOpen);
  const setAIOpen = useStore(s => s.setAIOpen);
  const setLibraryOpen = useStore(s => s.setLibraryOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      // Use useStore.getState() for values that change frequently to keep the effect stable
      const { settings } = useStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        actions.handleTogglePlay();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        updateSettings({ wpm: Math.min(600, settings.wpm + 5) });
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        updateSettings({ wpm: Math.max(10, settings.wpm - 5) });
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
        updateSettings({ mirrorX: !settings.mirrorX });
      } else if (e.key === 'f' || e.key === 'F') {
        actions.handleToggleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        updateSettings({ cameraOverlay: !settings.cameraOverlay });
      } else if (e.key === 'v' || e.key === 'V') {
        actions.handleToggleVoice();
      } else if (e.key === '+' || e.key === '=') {
        updateSettings({ fontSize: Math.min(120, settings.fontSize + 2) });
      } else if (e.key === '-' || e.key === '_') {
        updateSettings({ fontSize: Math.max(20, settings.fontSize - 2) });
      } else if (e.key === 'Escape') {
        setSettingsOpen(false);
        setShortcutsOpen(false);
        setAIOpen(false);
        setLibraryOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, updateSettings, setSettingsOpen, setShortcutsOpen, setAIOpen, setLibraryOpen]);
};
