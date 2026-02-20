import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore.js';
import { useLangStore } from '../stores/langStore.js';
import { useT } from '../i18n/index.js';
import { DraggableResizableDialog } from './DraggableResizableDialog.js';
import { API_BASE } from '@dmap-web/shared';
import type { DirListing } from '../types/filesystem.js';
const LAST_DIR_KEY = 'dmap-plugin-last-dir';
const GITHUB_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

interface AddPluginDialogProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddPluginDialog({ onClose, onAdded }: AddPluginDialogProps) {
  const { installPlugin, selectPlugin, fetchSkills, fetchMenus } = useAppStore(useShallow((s) => ({
    installPlugin: s.installPlugin,
    selectPlugin: s.selectPlugin,
    fetchSkills: s.fetchSkills,
    fetchMenus: s.fetchMenus,
  })));
  const { lang } = useLangStore();
  const t = useT();

  // Tab state
  const [sourceType, setSourceType] = useState<'github' | 'local'>('github');

  // GitHub tab state
  const [orgRepo, setOrgRepo] = useState('');

  // Local tab state
  const [pluginName, setPluginName] = useState('');
  const [dirPath, setDirPath] = useState(() => localStorage.getItem(LAST_DIR_KEY) || '');

  // Common state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [installStep, setInstallStep] = useState<'' | 'marketplace'>('');
  const [dirListing, setDirListing] = useState<DirListing | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  const errorMessages: Record<string, string> = {
    directory_not_found: t('plugin.error.notFound'),
    no_plugin_json: t('plugin.error.noPluginJson'),
    no_skills_dir: t('plugin.error.noSkillsDir'),
    already_registered: t('plugin.error.alreadyRegistered'),
    invalid_repo_format: t('plugin.error.invalidGithubRepo'),
    install_in_progress: t('plugin.error.installInProgress'),
    cli_failure: t('plugin.error.cliFailure'),
  };

  const fetchDir = async (path?: string) => {
    setBrowseLoading(true);
    try {
      const url = path
        ? `${API_BASE}/filesystem/list?path=${encodeURIComponent(path)}`
        : `${API_BASE}/filesystem/list`;
      const res = await fetch(url);
      if (res.ok) {
        setDirListing(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setBrowseLoading(false);
    }
  };

  const autoValidate = async (dir: string) => {
    if (!dir.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/plugins/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir: dir }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.name && !pluginName.trim()) {
          setPluginName(data.name);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSelectDir = (path: string) => {
    setDirPath(path);
    setError('');
    autoValidate(path);
  };

  const handleNavigate = (dirPath: string) => {
    setDirPath(dirPath);
    setError('');
    fetchDir(dirPath);
    autoValidate(dirPath);
  };

  const handleTabSwitch = (tab: 'github' | 'local') => {
    setSourceType(tab);
    setError('');
    setInstallStep('');
  };

  const isValidRepo = orgRepo.trim() ? GITHUB_REPO_PATTERN.test(orgRepo.trim()) : true;

  const handleAdd = async () => {
    setLoading(true);
    setError('');

    try {
      if (sourceType === 'github') {
        if (!orgRepo.trim() || !GITHUB_REPO_PATTERN.test(orgRepo.trim())) {
          setError(t('plugin.error.invalidGithubRepo'));
          setLoading(false);
          return;
        }

        setInstallStep('marketplace');
        const result = await installPlugin('github', orgRepo.trim());

        if (result.warning) {
          setError(t('plugin.warning.registryFailed'));
        }

        const plugins = useAppStore.getState().plugins;
        const newPlugin = plugins.find((p: any) => p.name === result.pluginName || p.id === result.pluginName);
        if (newPlugin) {
          selectPlugin(newPlugin);
          setTimeout(() => { fetchSkills(); fetchMenus(); }, 0);
        }
        onAdded();
      } else {
        if (!dirPath.trim() || !pluginName.trim()) {
          setLoading(false);
          return;
        }

        setInstallStep('marketplace');
        const displayNames = { ko: pluginName.trim(), en: pluginName.trim() };
        const result = await installPlugin('local', dirPath.trim(), displayNames);

        localStorage.setItem(LAST_DIR_KEY, dirPath.trim());

        if (result.warning) {
          setError(t('plugin.warning.registryFailed'));
        }

        const plugins = useAppStore.getState().plugins;
        const newPlugin = plugins.find((p: any) => p.name === result.pluginName || p.id === result.pluginName);
        if (newPlugin) {
          try {
            await useAppStore.getState().syncAgents(newPlugin.id);
          } catch { /* ignore */ }
          selectPlugin(newPlugin);
          setTimeout(() => { fetchSkills(); fetchMenus(); }, 0);
        }
        onAdded();
      }
    } catch (err: any) {
      setError(errorMessages[err.message] || err.message);
    } finally {
      setLoading(false);
      setInstallStep('');
    }
  };

  useEffect(() => {
    if (sourceType === 'local') {
      fetchDir(dirPath || undefined);
      if (dirPath) autoValidate(dirPath);
    }
  }, [sourceType]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isAddDisabled = sourceType === 'github'
    ? !orgRepo.trim() || !isValidRepo || loading
    : !dirPath.trim() || !pluginName.trim() || loading;

  const loadingText = installStep === 'marketplace'
    ? t('plugin.step.marketplaceAdd')
    : t('plugin.validating');

  return (
    <DraggableResizableDialog
      initialWidth={480}
      initialHeight={560}
      storageKey="add-plugin"
      onClose={onClose}
      role="dialog"
      aria-modal={true}
      aria-labelledby="add-plugin-dialog-title"
    >
        {/* Header */}
        <div data-drag-handle className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 cursor-move flex-shrink-0">
          <h2 id="add-plugin-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('plugin.add')}
          </h2>
        </div>

        {/* Tab Bar */}
        <div className="px-6 pt-3 flex gap-0 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => handleTabSwitch('github')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              sourceType === 'github'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('plugin.tab.github')}
          </button>
          <button
            onClick={() => handleTabSwitch('local')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              sourceType === 'local'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('plugin.tab.local')}
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 min-h-0 flex flex-col gap-4">
          {sourceType === 'github' ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('plugin.githubRepo')}
                </label>
                <input
                  type="text"
                  value={orgRepo}
                  onChange={(e) => { setOrgRepo(e.target.value); setError(''); }}
                  placeholder={t('plugin.githubRepoPlaceholder')}
                  className={`w-full px-3 py-2 text-sm border ${
                    orgRepo.trim() && !isValidRepo
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-gray-200 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {orgRepo.trim() && !isValidRepo && (
                  <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                    {t('plugin.error.invalidGithubRepo')}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('plugin.name')}
                </label>
                <input
                  type="text"
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  placeholder={lang === 'ko' ? 'My Plugin 한국어 이름' : 'My Plugin Name'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('plugin.projectDir')}
                </label>
                <input
                  type="text"
                  value={dirPath}
                  onChange={(e) => { setDirPath(e.target.value); setError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dirPath.trim()) {
                      e.preventDefault();
                      fetchDir(dirPath.trim());
                      autoValidate(dirPath.trim());
                    }
                  }}
                  placeholder="C:\Users\user\workspace\my-plugin"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && (
                  <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                    {dirListing?.current || '...'}
                  </span>
                </div>
                <div className="overflow-y-auto flex-1">
                  {browseLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">{t('plugin.validating')}</div>
                  ) : (
                    <>
                      {dirListing?.parent && (
                        <button
                          onClick={() => handleNavigate(dirListing.parent!)}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                        >
                          <span>{'\u2190'}</span> {t('plugin.dirBrowser.parent')}
                        </button>
                      )}
                      {dirListing?.directories.length === 0 && (
                        <div className="px-3 py-3 text-center text-sm text-gray-400 dark:text-gray-500">
                          {t('plugin.dirBrowser.empty')}
                        </div>
                      )}
                      {dirListing?.directories.map((dir) => (
                        <button
                          key={dir.path}
                          onClick={() => handleNavigate(dir.path)}
                          onDoubleClick={() => handleSelectDir(dir.path)}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                          </svg>
                          <span className="truncate">{dir.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('plugin.cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={isAddDisabled}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? loadingText : t('plugin.addBtn')}
          </button>
        </div>
    </DraggableResizableDialog>
  );
}
