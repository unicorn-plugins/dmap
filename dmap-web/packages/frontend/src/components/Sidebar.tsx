import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { SkillCard } from './SkillCard.js';
import { SettingsMenu } from './SettingsMenu.js';
import { PluginSwitcher } from './PluginSwitcher.js';
import { AddPluginDialog } from './AddPluginDialog.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import { SKILL_CATEGORIES } from '@dmap-web/shared';
import type { SkillMeta } from '@dmap-web/shared';

export function Sidebar() {
  const { skills, selectedSkill, selectSkill, isStreaming, fetchSkills, selectedPlugin, fetchPlugins, syncAgents } = useAppStore();
  const { lang } = useLangStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'fail'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const t = useT();

  useEffect(() => {
    fetchPlugins().then(() => fetchSkills());
  }, [fetchPlugins, fetchSkills]);

  const grouped = skills.reduce<Record<string, SkillMeta[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const handleSyncAgents = async () => {
    if (!selectedPlugin || syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    setSyncMessage(t('agentSync.syncing'));
    try {
      const result = await syncAgents(selectedPlugin.id);
      if (result.count > 0) {
        setSyncStatus('success');
        setSyncMessage(t('agentSync.success').replace('{{count}}', String(result.count)));
      } else {
        setSyncStatus('success');
        setSyncMessage(t('agentSync.noAgents'));
      }
    } catch {
      setSyncStatus('fail');
      setSyncMessage(t('agentSync.fail'));
    }
    // Reset after 3 seconds
    setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 3000);
  };

  return (
    <aside className="w-full h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <PluginSwitcher disabled={isStreaming} />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddDialog(true)}
              className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('plugin.add')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            <SettingsMenu version={selectedPlugin?.version || ''} />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {selectedPlugin?.description || t('sidebar.subtitle')}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Agent Sync button */}
        {selectedPlugin && (
          <div className="px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAgents}
                disabled={isStreaming || syncStatus === 'syncing'}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  syncStatus === 'success'
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : syncStatus === 'fail'
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                } ${(isStreaming || syncStatus === 'syncing') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {syncStatus === 'syncing' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                )}
                <span>{syncMessage || t('agentSync.label')}</span>
              </button>
              <div className="relative group">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                <div className="absolute right-0 top-full mt-2 w-72 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-pre-line pointer-events-none">
                  {t('agentSync.tooltip')}
                </div>
              </div>
            </div>
          </div>
        )}

        {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => {
          const categorySkills = grouped[key];
          if (!categorySkills?.length) return null;

          return (
            <div key={key}>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
                {t(`category.${key}` as keyof import('../i18n/types.js').Translations) || cat.label}
              </h2>
              <div className="space-y-1">
                {categorySkills.map((skill) => (
                  <SkillCard
                    key={skill.name}
                    skill={skill}
                    isSelected={selectedSkill?.name === skill.name}
                    onClick={() => !isStreaming && selectSkill(skill)}
                    disabled={isStreaming}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-400 truncate">
        {selectedPlugin?.displayNames?.[lang] || selectedPlugin?.name || 'Plugin'} v{selectedPlugin?.version || '...'}
      </div>

      {showAddDialog && (
        <AddPluginDialog
          onClose={() => setShowAddDialog(false)}
          onAdded={() => setShowAddDialog(false)}
        />
      )}
    </aside>
  );
}
