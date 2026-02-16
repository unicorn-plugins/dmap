import { useState, useEffect, useCallback } from 'react';
import { useT } from '../i18n/index.js';
import { DraggableResizableDialog } from './DraggableResizableDialog.js';
import { API_BASE } from '@dmap-web/shared';
import type { DirListing } from '../types/filesystem.js';
const LAST_DIR_KEY = 'dmap-file-browser-last-dir';

interface FileBrowserDialogProps {
  onSelect: (filePaths: string[]) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileBrowserDialog({ onSelect, onClose }: FileBrowserDialogProps) {
  const t = useT();
  const [dirListing, setDirListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [pathInput, setPathInput] = useState('');

  const fetchDir = useCallback(async (dirPath?: string) => {
    setLoading(true);
    try {
      const url = dirPath
        ? `${API_BASE}/filesystem/list?path=${encodeURIComponent(dirPath)}&includeFiles=true`
        : `${API_BASE}/filesystem/list?includeFiles=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDirListing(data);
        if (data.current) {
          setPathInput(data.current);
          localStorage.setItem(LAST_DIR_KEY, data.current);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const lastDir = localStorage.getItem(LAST_DIR_KEY);
    fetchDir(lastDir || undefined);
  }, [fetchDir]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleNavigate = (dirPath: string) => {
    setSelectedPaths(new Set());
    fetchDir(dirPath);
  };

  const toggleFile = (filePath: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const handleSelect = () => {
    if (selectedPaths.size > 0) {
      onSelect(Array.from(selectedPaths));
    }
  };

  return (
    <DraggableResizableDialog initialWidth={520} initialHeight={500} storageKey="file-browser" onClose={onClose}>
        {/* Header */}
        <div data-drag-handle className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-move flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('fileBrowser.title')}
          </h2>
          {selectedPaths.size > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {t('fileBrowser.selectedCount').replace('{{count}}', String(selectedPaths.size))}
            </span>
          )}
        </div>

        {/* Editable path */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pathInput.trim()) {
                e.preventDefault();
                handleNavigate(pathInput.trim());
              }
            }}
            placeholder="C:\Users\..."
            className="w-full px-2 py-1 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Browser */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="px-3 py-8 text-center text-sm text-gray-400">...</div>
          ) : (
            <>
              {/* Parent directory */}
              {dirListing?.parent && (
                <button
                  onClick={() => handleNavigate(dirListing.parent!)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/50"
                >
                  <span>{'\u2190'}</span> {t('plugin.dirBrowser.parent')}
                </button>
              )}

              {/* Directories */}
              {dirListing?.directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => handleNavigate(dir.path)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                  <span className="truncate">{dir.name}</span>
                </button>
              ))}

              {/* Files */}
              {dirListing?.files && dirListing.files.length > 0 ? (
                dirListing.files.map((file) => {
                  const isSelected = selectedPaths.has(file.path);
                  return (
                    <button
                      key={file.path}
                      onClick={() => toggleFile(file.path)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* File icon */}
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatSize(file.size)}</span>
                    </button>
                  );
                })
              ) : (
                !dirListing?.directories.length && !loading && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    {t('fileBrowser.empty')}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('fileBrowser.cancel')}
          </button>
          <button
            onClick={handleSelect}
            disabled={selectedPaths.size === 0}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('fileBrowser.select')}
          </button>
        </div>
    </DraggableResizableDialog>
  );
}
