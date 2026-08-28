import React from 'react';
import { useStore, DEFAULT_SETTINGS } from '../store/useStore';
import { RecordingModal } from './RecordingModal';
import { ScriptsLibraryModal } from './ScriptsLibraryModal';
import { SettingsModal } from './SettingsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { DonationModal } from './DonationModal';
import { UserManualModal } from './UserManualModal';
import { AIAssistantModal } from './AIAssistantModal';

interface ModalsContainerProps {
  latestTake: any;
  takesHistory: any[];
  onDeleteTake: (id: string) => void;
  onClearAllTakes: () => void;
  onToggleRecord: () => void;
}

export const ModalsContainer: React.FC<ModalsContainerProps> = ({
  latestTake,
  takesHistory = [],
  onDeleteTake,
  onClearAllTakes,
  onToggleRecord,
}) => {
  // Use granular selectors for stability
  const scripts = useStore(s => s.scripts || []);
  const settings = useStore(s => s.settings || DEFAULT_SETTINGS);
  const activeScriptId = useStore(s => s.activeScriptId);
  const isRecordingModalOpen = useStore(s => s.isRecordingModalOpen);
  const isLibraryOpen = useStore(s => s.isLibraryOpen);
  const isSettingsOpen = useStore(s => s.isSettingsOpen);
  const isShortcutsOpen = useStore(s => s.isShortcutsOpen);
  const isDonationOpen = useStore(s => s.isDonationOpen);
  const isManualOpen = useStore(s => s.isManualOpen);
  const isAIOpen = useStore(s => s.isAIOpen);

  // Actions
  const setRecordingModalOpen = useStore(s => s.setRecordingModalOpen);
  const setLibraryOpen = useStore(s => s.setLibraryOpen);
  const setActiveScriptId = useStore(s => s.setActiveScriptId);
  const setMobileScreen = useStore(s => s.setMobileScreen);
  const createScript = useStore(s => s.createScript);
  const deleteScript = useStore(s => s.deleteScript);
  const cloneScript = useStore(s => s.cloneScript);
  const addScript = useStore(s => s.addScript);
  const setAIOpen = useStore(s => s.setAIOpen);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const updateSettings = useStore(s => s.updateSettings);
  const setDonationOpen = useStore(s => s.setDonationOpen);
  const setManualOpen = useStore(s => s.setManualOpen);
  const updateScript = useStore(s => s.updateScript);
  const setShortcutsOpen = useStore(s => s.setShortcutsOpen);

  const activeScript = scripts.find(s => s.id === activeScriptId) || scripts[0];

  return (
    <>
      <RecordingModal
        isOpen={!!isRecordingModalOpen}
        take={latestTake}
        takesHistory={takesHistory}
        onClose={() => setRecordingModalOpen(false)}
        onRetake={() => {
          setRecordingModalOpen(false);
          onToggleRecord();
        }}
        onDeleteTake={onDeleteTake}
        onClearAllTakes={onClearAllTakes}
      />

      <ScriptsLibraryModal
        isOpen={!!isLibraryOpen}
        onClose={() => setLibraryOpen(false)}
        scripts={scripts}
        activeScriptId={activeScriptId}
        onSelectScript={(id) => {
          setActiveScriptId(id);
          setMobileScreen('editor');
        }}
        onCreateScript={createScript}
        onDeleteScript={deleteScript}
        onCloneScript={cloneScript}
        onImportScript={(newScript) => {
          addScript(newScript);
        }}
        onOpenAIModal={() => {
          setLibraryOpen(false);
          setAIOpen(true);
        }}
      />

      <SettingsModal
        isOpen={!!isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onOpenDonation={() => setDonationOpen(true)}
        onOpenManual={() => setManualOpen(true)}
      />

      <ShortcutsModal
        isOpen={!!isShortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <DonationModal
        isOpen={!!isDonationOpen}
        onClose={() => setDonationOpen(false)}
      />

      <UserManualModal
        isOpen={!!isManualOpen}
        onClose={() => setManualOpen(false)}
      />

      <AIAssistantModal
        isOpen={!!isAIOpen}
        onClose={() => setAIOpen(false)}
        currentScriptContent={activeScript?.content || ''}
        onApplyScript={(newContent) => {
          if (activeScript) {
            updateScript({
              ...activeScript,
              content: newContent,
              updatedAt: new Date().toISOString(),
            });
          }
        }}
        onCreateNewScriptWithContent={(title, content) => {
          const newScript = {
            id: `script-${Date.now()}`,
            title,
            category: 'IA Generado',
            targetWPM: 135,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          addScript(newScript);
          setMobileScreen('editor');
        }}
        onOpenDonation={() => setDonationOpen(true)}
      />
    </>
  );
};
