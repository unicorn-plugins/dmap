import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import type { PluginInfo, SkillMeta } from '@dmap-web/shared';

interface PluginSwitcherProps {
  disabled?: boolean;
}

export function PluginSwitcher({ disabled }: PluginSwitcherProps) {
  const { plugins, selectedPlugin, selectPlugin, removePlugin, fetchSkills } = useAppStore();
  const { lang } = useLangStore();
  const [open, setOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Close on outside click (same pattern as SettingsMenu)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSelect = async (plugin: PluginInfo) => {
    if (plugin.id === selectedPlugin?.id) {
      setOpen(false);
      return;
    }
    selectPlugin(plugin);
    setOpen(false);

    // Fetch skills for the new plugin
    const fetchedSkills = await new Promise<SkillMeta[]>((resolve) => {
      setTimeout(async () => {
        await fetchSkills();
        resolve(useAppStore.getState().skills);
      }, 0);
    });

    // Setup guard: if setup not completed, auto-select setup skill and show toast
    if (!plugin.setupCompleted) {
      const setupSkill = fetchedSkills.find((s) => s.name === 'setup');
      if (setupSkill) {
        useAppStore.getState().selectSkill(setupSkill);
        useAppStore.getState().showToast(t('setup.required'));
      }
    }
  };

  const handleRemoveClick = (e: React.MouseEvent, pluginId: string) => {
    e.stopPropagation();
    setConfirmRemoveId(pluginId === confirmRemoveId ? null : pluginId);
  };

  const handleConfirmRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmRemoveId) return;
    try {
      await removePlugin(confirmRemoveId);
    } catch {
      // ignore
    }
    setConfirmRemoveId(null);
    setOpen(false);
  };

  const handleCancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmRemoveId(null);
  };

  const displayName = selectedPlugin?.displayNames?.[lang] || selectedPlugin?.name || 'Plugin';
  const showSwitcher = plugins.length > 1;

  return (
    <div className="relative flex items-center gap-1" ref={menuRef}>
      {/* Plugin name / switcher trigger */}
      {showSwitcher ? (
        <button
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[180px]"
        >
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
          {displayName}
        </h1>
      )}

      {/* Plugin list popover */}
      {open && showSwitcher && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1">
          {plugins.map((plugin) => (
            <button
              key={plugin.id}
              onClick={() => handleSelect(plugin)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 ${
                selectedPlugin?.id === plugin.id
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{plugin.displayNames?.[lang] || plugin.name}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">v{plugin.version}</div>
              </div>
              {/* DMAP: checkmark when selected. Others: always show X */}
              {plugins.indexOf(plugin) === 0 ? (
                selectedPlugin?.id === plugin.id && (
                  <span className="text-blue-500 flex-shrink-0">{'\u2713'}</span>
                )
              ) : (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => handleRemoveClick(e, plugin.id)}
                    className="p-0.5 rounded text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                    title={t('plugin.remove')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {confirmRemoveId === plugin.id && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[60] p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t('plugin.removeConfirm')}</p>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelRemove}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          {t('plugin.cancel')}
                        </button>
                        <button
                          onClick={handleConfirmRemove}
                          className="px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
                        >
                          {t('plugin.remove')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
