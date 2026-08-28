import React from 'react';
import { useStore } from '../store/useStore';
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
  takesHistory,
  onDeleteTake,
  onClearAllTakes,
  onToggleRecord,
}) => {
  const store = useStore();
  const activeScript = store.scripts.find(s => s.id === store.activeScriptId);

  return (
    <>
      <RecordingModal
        isOpen={store.isRecordingModalOpen}
        take={latestTake}
        takesHistory={takesHistory}
        onClose={() => store.setRecordingModalOpen(false)}
        onRetake={() => {
          store.setRecordingModalOpen(false);
          onToggleRecord();
        }}
        onDeleteTake={onDeleteTake}
        onClearAllTakes={onClearAllTakes}
      />

      <ScriptsLibraryModal
        isOpen={store.isLibraryOpen}
        onClose={() => store.setLibraryOpen(false)}
        scripts={store.scripts}
        activeScriptId={store.activeScriptId}
        onSelectScript={(id) => {
          store.setActiveScriptId(id);
          store.setMobileScreen('editor');
        }}
        onCreateScript={store.createScript}
        onDeleteScript={store.deleteScript}
        onCloneScript={store.cloneScript}
        onImportScript={(newScript) => {
          store.addScript(newScript);
        }}
        onOpenAIModal={() => {
          store.setLibraryOpen(false);
          store.setAIOpen(true);
        }}
      />

      <SettingsModal
        isOpen={store.isSettingsOpen}
        onClose={() => store.setSettingsOpen(false)}
        settings={store.settings}
        onUpdateSettings={store.updateSettings}
        onOpenDonation={() => store.setDonationOpen(true)}
        onOpenManual={() => store.setManualOpen(true)}
      />

      <ShortcutsModal
        isOpen={store.isShortcutsOpen}
        onClose={() => store.setShortcutsOpen(false)}
      />

      <DonationModal
        isOpen={store.isDonationOpen}
        onClose={() => store.setDonationOpen(false)}
      />

      <UserManualModal
        isOpen={store.isManualOpen}
        onClose={() => store.setManualOpen(false)}
      />

      <AIAssistantModal
        isOpen={store.isAIOpen}
        onClose={() => store.setAIOpen(false)}
        currentScriptContent={activeScript?.content || ''}
        onApplyScript={(newContent) => {
          if (activeScript) {
            store.updateScript({
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
          store.addScript(newScript);
          store.setMobileScreen('editor');
        }}
        onOpenDonation={() => store.setDonationOpen(true)}
      />
    </>
  );
};
