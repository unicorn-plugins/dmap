import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useLangStore } from '../stores/langStore.js';
import { useT } from '../i18n/index.js';
import { DraggableResizableDialog } from './DraggableResizableDialog.js';

const API_BASE = '/api';
const LAST_DIR_KEY = 'dmap-plugin-last-dir';

interface DirEntry {
  name: string;
  path: string;
}

interface DirListing {
  current: string;
  parent: string | null;
  directories: DirEntry[];
}

interface AddPluginDialogProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddPluginDialog({ onClose, onAdded }: AddPluginDialogProps) {
  const { addPlugin, selectPlugin, fetchSkills } = useAppStore();
  const { lang } = useLangStore();
  const t = useT();
  const [pluginName, setPluginName] = useState('');
  const [dirPath, setDirPath] = useState(() => localStorage.getItem(LAST_DIR_KEY) || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirListing, setDirListing] = useState<DirListing | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  const errorMessages: Record<string, string> = {
    directory_not_found: t('plugin.error.notFound'),
    no_plugin_json: t('plugin.error.noPluginJson'),
    no_skills_dir: t('plugin.error.noSkillsDir'),
    already_registered: t('plugin.error.alreadyRegistered'),
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

  // Auto-validate directory and pre-fill plugin name from plugin.json
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

  const handleAdd = async () => {
    if (!dirPath.trim() || !pluginName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const displayNames = { ko: pluginName.trim(), en: pluginName.trim() };
      const newPlugin = await addPlugin(dirPath.trim(), displayNames);
      localStorage.setItem(LAST_DIR_KEY, dirPath.trim());
      // Auto-sync plugin agents after adding
      try {
        await useAppStore.getState().syncAgents(newPlugin.id);
      } catch { /* ignore sync errors on add */ }
      selectPlugin(newPlugin);
      setTimeout(() => fetchSkills(), 0);
      onAdded();
    } catch (err: any) {
      setError(errorMessages[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch directory listing on mount
  useEffect(() => {
    fetchDir(dirPath || undefined);
    if (dirPath) autoValidate(dirPath);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <DraggableResizableDialog initialWidth={480} initialHeight={560} storageKey="add-plugin" onClose={onClose}>
        {/* Header */}
        <div data-drag-handle className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 cursor-move flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('plugin.add')}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 min-h-0 flex flex-col gap-4">
          {/* Name input */}
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

          {/* Directory input */}
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

          {/* Directory browser */}
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
            disabled={!dirPath.trim() || !pluginName.trim() || loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('plugin.validating') : t('plugin.addBtn')}
          </button>
        </div>
    </DraggableResizableDialog>
  );
}
