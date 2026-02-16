import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore.js';
import { useLangStore } from '../stores/langStore.js';
import { useT, LANGUAGES } from '../i18n/index.js';
import { AboutDialog } from './AboutDialog.js';
import { Tooltip } from './Tooltip.js';

interface SettingsMenuProps {
  version: string;
}

export function SettingsMenu({ version }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<'theme' | 'language' | 'about' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useThemeStore();
  const { lang, setLang } = useLangStore();
  const t = useT();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenu(null);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative group" ref={menuRef}>
      <button
        onClick={() => { setOpen(!open); setSubmenu(null); }}
        className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
      {!open && <Tooltip text={t('settings.title')} />}

      {open && !submenu && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={() => setSubmenu('theme')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {theme === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}'} {t('settings.theme')}
          </button>
          <button
            onClick={() => setSubmenu('language')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {'\u{1F310}'} {t('settings.language')}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('dmap-startup-check-passed');
              window.location.reload();
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {'\u{1F50D}'} {t('settings.systemCheck')}
          </button>
          <button
            onClick={() => setSubmenu('about')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {'\u{2139}\u{FE0F}'} {t('settings.about')}
          </button>
        </div>
      )}

      {open && submenu === 'theme' && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={() => setSubmenu(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {'\u{2190}'} {t('settings.back')}
          </button>
          <hr className="border-gray-200 dark:border-gray-700" />
          <button
            onClick={() => { setTheme('light'); setOpen(false); setSubmenu(null); }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
              theme === 'light'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {'\u{2600}\u{FE0F}'} Light
            {theme === 'light' && <span className="ml-auto text-blue-600 dark:text-blue-400">{'\u{2713}'}</span>}
          </button>
          <button
            onClick={() => { setTheme('dark'); setOpen(false); setSubmenu(null); }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
              theme === 'dark'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {'\u{1F319}'} Dark
            {theme === 'dark' && <span className="ml-auto text-blue-600 dark:text-blue-400">{'\u{2713}'}</span>}
          </button>
        </div>
      )}

      {open && submenu === 'language' && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={() => setSubmenu(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {'\u{2190}'} {t('settings.back')}
          </button>
          <hr className="border-gray-200 dark:border-gray-700" />
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); setSubmenu(null); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                lang === l.code
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {l.label}
              {lang === l.code && <span className="ml-auto text-blue-600 dark:text-blue-400">{'\u{2713}'}</span>}
            </button>
          ))}
        </div>
      )}

      {submenu === 'about' && (
        <AboutDialog
          version={version}
          onClose={() => { setOpen(false); setSubmenu(null); }}
        />
      )}
    </div>
  );
}
