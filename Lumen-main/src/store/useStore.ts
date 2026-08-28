import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  PrompterMode,
  PrompterSettings,
  PlaybackStatus,
  Script
} from '../types';
import { PRESET_SCRIPTS } from '../data/presetScripts';

export const DEFAULT_SETTINGS: PrompterSettings = {
  wpm: 135,
  fontSize: 48,
  lineHeight: 1.35,
  safeMargin: 12,
  mirrorX: false,
  mirrorY: false,
  textColor: '#ffffff',
  bgColor: '#000000',
  readerLineStyle: 'bar',
  readerLinePosition: 35,
  readerLineColor: '#00d1ff',
  countdownSeconds: 5,
  cameraOverlay: true,
  cameraLayout: 'pip',
  cameraPosition: 'left',
  cameraMirror: true,
  cameraFramingGuides: true,
  cameraOpacity: 0.35,
  speechTracking: false,
  focusDim: false,
  autoHideControls: false,
  showWordCount: true,
  showTimer: true,
  showProgressBar: true,
  fontFamily: 'Inter',
};

interface AppState {
  // Data
  scripts: Script[];
  activeScriptId: string;
  settings: PrompterSettings;

  // UI State
  mode: PrompterMode;
  mobileScreen: 'editor' | 'prompter' | 'library';
  playbackStatus: PlaybackStatus;
  isFullscreen: boolean;
  elapsedSeconds: number;
  countdownNumber: number | null;
  isAudioRehearsing: boolean;
  voiceBanner: string | null;

  // Modals
  isSettingsOpen: boolean;
  isShortcutsOpen: boolean;
  isAIOpen: boolean;
  isLibraryOpen: boolean;
  isRecordingModalOpen: boolean;
  isDonationOpen: boolean;
  isManualOpen: boolean;
  isMobileMoreOpen: boolean;

  // Actions
  setScripts: (scripts: Script[]) => void;
  setActiveScriptId: (id: string) => void;
  updateSettings: (newSettings: Partial<PrompterSettings>) => void;
  setMode: (mode: PrompterMode) => void;
  setMobileScreen: (screen: 'editor' | 'prompter' | 'library') => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setIsFullscreen: (full: boolean) => void;
  setElapsedSeconds: (seconds: number | ((prev: number) => number)) => void;
  setCountdownNumber: (num: number | null) => void;
  setIsAudioRehearsing: (rehearsing: boolean) => void;
  setVoiceBanner: (banner: string | null) => void;

  // Modal Actions
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setAIOpen: (open: boolean) => void;
  setLibraryOpen: (open: boolean) => void;
  setRecordingModalOpen: (open: boolean) => void;
  setDonationOpen: (open: boolean) => void;
  setManualOpen: (open: boolean) => void;
  setMobileMoreOpen: (open: boolean) => void;

  // Script Actions
  updateScript: (updatedScript: Script) => void;
  createScript: () => void;
  deleteScript: (id: string) => void;
  cloneScript: (script: Script) => void;
  addScript: (script: Script) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Data Initial State
      scripts: PRESET_SCRIPTS,
      activeScriptId: PRESET_SCRIPTS[0]?.id || '',
      settings: DEFAULT_SETTINGS,

      // UI Initial State
      mode: 'studio',
      mobileScreen: 'editor',
      playbackStatus: 'idle',
      isFullscreen: false,
      elapsedSeconds: 0,
      countdownNumber: null,
      isAudioRehearsing: false,
      voiceBanner: null,

      // Modals Initial State
      isSettingsOpen: false,
      isShortcutsOpen: false,
      isAIOpen: false,
      isLibraryOpen: false,
      isRecordingModalOpen: false,
      isDonationOpen: false,
      isManualOpen: false,
      isMobileMoreOpen: false,

      // Actions
      setScripts: (scripts) => set({ scripts: scripts || [] }),
      setActiveScriptId: (id) => set({ activeScriptId: id }),
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...(state.settings || DEFAULT_SETTINGS), ...newSettings }
      })),
      setMode: (mode) => set({ mode }),
      setMobileScreen: (screen) => set({ mobileScreen: screen }),
      setPlaybackStatus: (status) => set({ playbackStatus: status }),
      setIsFullscreen: (full) => set({ isFullscreen: full }),
      setElapsedSeconds: (seconds) => set((state) => ({
        elapsedSeconds: typeof seconds === 'function' ? seconds(state.elapsedSeconds) : seconds
      })),
      setCountdownNumber: (num) => set({ countdownNumber: num }),
      setIsAudioRehearsing: (rehearsing) => set({ isAudioRehearsing: rehearsing }),
      setVoiceBanner: (banner) => set({ voiceBanner: banner }),

      // Modal Actions
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
      setAIOpen: (open) => set({ isAIOpen: open }),
      setLibraryOpen: (open) => set({ isLibraryOpen: open }),
      setRecordingModalOpen: (open) => set({ isRecordingModalOpen: open }),
      setDonationOpen: (open) => set({ isDonationOpen: open }),
      setManualOpen: (open) => set({ isManualOpen: open }),
      setMobileMoreOpen: (open) => set({ isMobileMoreOpen: open }),

      // Script Actions
      updateScript: (updatedScript) => set((state) => ({
        scripts: (state.scripts || []).map((s) => (s.id === updatedScript.id ? updatedScript : s))
      })),
      createScript: () => {
        const { scripts } = get();
        const scriptsList = scripts || [];
        const newScript: Script = {
          id: `script-${Date.now()}`,
          title: `Nuevo Guión ${scriptsList.length + 1}`,
          category: 'General',
          targetWPM: 135,
          content: `[MIRAR FIJAMENTE A CÁMARA]\nHola a todos. Bienvenidos a esta sesión.\n\n[PAUSA 2s]\nEscribe aquí tu discurso...`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          scripts: [newScript, ...(state.scripts || [])],
          activeScriptId: newScript.id
        }));
      },
      deleteScript: (id) => {
        const { scripts } = get();
        const scriptsList = scripts || [];
        if (scriptsList.length <= 1) return;
        const remaining = scriptsList.filter((s) => s.id !== id);
        set({
          scripts: remaining,
          activeScriptId: remaining[0].id
        });
      },
      cloneScript: (script) => {
        const cloned: Script = {
          ...script,
          id: `script-${Date.now()}`,
          title: `${script.title} (Copia)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          scripts: [cloned, ...(state.scripts || [])],
          activeScriptId: cloned.id
        }));
      },
      addScript: (script) => set((state) => ({
        scripts: [script, ...(state.scripts || [])],
        activeScriptId: script.id
      }))
    }),
    {
      name: 'lumen_teleprompter_storage_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scripts: state.scripts,
        settings: state.settings,
        activeScriptId: state.activeScriptId
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Safety checks after hydration
          if (!state.settings) state.settings = DEFAULT_SETTINGS;
          if (!state.scripts) state.scripts = PRESET_SCRIPTS;

          state.settings.speechTracking = false;
          state.settings.cameraOverlay = true;
        }
      }
    }
  )
);
