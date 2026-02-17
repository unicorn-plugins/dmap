import { useEffect, useCallback, useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';
import type { Translations } from '../i18n/types.js';

interface TranscriptSession {
  id: string;
  summary: string;
  lastModified: string;
  fileSize: number;
  messageCount: number;
}

function formatTimeAgo(dateStr: string, t: (key: keyof Translations) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('session.timeAgo.now');
  if (minutes < 60) return t('session.timeAgo.minutes').replace('{{n}}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('session.timeAgo.hours').replace('{{n}}', String(hours));
  const days = Math.floor(hours / 24);
  return t('session.timeAgo.days').replace('{{n}}', String(days));
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 제목 수정 팝업 */
function EditTitlePopup({
  currentTitle,
  onSave,
  onCancel,
}: {
  currentTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('session.editTitle')}</h4>
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          placeholder={t('session.editPlaceholder')}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('plugin.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {t('common.send')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SessionListProps {
  skillName?: string;
}

export function SessionList({ skillName }: SessionListProps) {
  const { sessions, fetchSessions, isStreaming, loadTranscriptSession, selectedPlugin } = useAppStore(useShallow((s) => ({
    sessions: s.sessions,
    fetchSessions: s.fetchSessions,
    isStreaming: s.isStreaming,
    loadTranscriptSession: s.loadTranscriptSession,
    selectedPlugin: s.selectedPlugin,
  })));
  const t = useT();
  const pluginId = selectedPlugin?.id;
  const [transcriptSessions, setTranscriptSessions] = useState<TranscriptSession[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    // Fetch transcripts for current plugin's project directory
    setTranscriptLoading(true);
    const url = pluginId ? `/api/transcripts?pluginId=${pluginId}` : '/api/transcripts';
    fetch(url)
      .then(res => res.ok ? res.json() : { sessions: [] })
      .then(data => setTranscriptSessions(data.sessions || []))
      .catch(() => setTranscriptSessions([]))
      .finally(() => setTranscriptLoading(false));
  }, [fetchSessions, pluginId]);

  const isPromptSkill = skillName === '__prompt__';

  const filtered = skillName
    ? sessions.filter(s => s.skillName === skillName)
    : sessions;

  // Collect sdkSessionIds for current skill's sessions
  const skillSdkIds = new Set(
    filtered.filter(s => s.sdkSessionId).map(s => s.sdkSessionId!)
  );
  // Prompt skill: show ALL transcripts for the current project (like Claude Code /resume)
  // Other skills: only show skill-matched transcripts
  // Sort descending by lastModified (newest first)
  const filteredTranscripts = isPromptSkill
    ? [...transcriptSessions].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    : transcriptSessions
        .filter(ts => skillSdkIds.has(ts.id))
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  const handleTranscriptClick = useCallback((ts: TranscriptSession) => {
    if (isStreaming) return;
    loadTranscriptSession(ts.id, ts.summary);
  }, [isStreaming, loadTranscriptSession]);

  const handleEditSave = useCallback(async (id: string, newTitle: string) => {
    try {
      const url = pluginId
        ? `/api/transcripts/${id}/title?pluginId=${pluginId}`
        : `/api/transcripts/${id}/title`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setTranscriptSessions(prev =>
          prev.map(ts => ts.id === id ? { ...ts, summary: newTitle } : ts)
        );
      }
    } catch { /* ignore */ }
    setEditingId(null);
  }, [pluginId]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const deleteUrl = pluginId ? `/api/transcripts/${id}?pluginId=${pluginId}` : `/api/transcripts/${id}`;
      const res = await fetch(deleteUrl, { method: 'DELETE' });
      if (res.ok) {
        setTranscriptSessions(prev => prev.filter(ts => ts.id !== id));
      }
    } catch { /* ignore */ }
    setConfirmDeleteId(null);
  }, [pluginId]);

  const handleDeleteAll = useCallback(async () => {
    try {
      const ids = filteredTranscripts.map(ts => ts.id);
      if (ids.length === 0) return;
      const res = await fetch('/api/transcripts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, pluginId }),
      });
      if (res.ok) {
        const deletedSet = new Set(ids);
        setTranscriptSessions(prev => prev.filter(ts => !deletedSet.has(ts.id)));
      }
    } catch { /* ignore */ }
    setConfirmDeleteAll(false);
  }, [filteredTranscripts]);

  // Find the session being edited for passing current title to popup
  const editingSession = editingId ? filteredTranscripts.find(ts => ts.id === editingId) : null;

  if (filteredTranscripts.length === 0 && !transcriptLoading) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-12">
        <p>{t('session.empty')}</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Title edit popup */}
      {editingSession && (
        <EditTitlePopup
          currentTitle={editingSession.summary}
          onSave={(title) => handleEditSave(editingSession.id, title)}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('session.history')}
        </h3>
        {filteredTranscripts.length > 0 && (
          confirmDeleteAll ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-500">{t('session.deleteAllConfirm')}</span>
              <button
                onClick={handleDeleteAll}
                className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t('session.delete')}
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('plugin.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              disabled={isStreaming}
              className="px-2 py-0.5 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {t('session.deleteAll')}
            </button>
          )
        )}
      </div>
      <div className="space-y-2">
        {filteredTranscripts.map((ts) => (
          <div key={ts.id} className="group relative">
            <button
              onClick={() => handleTranscriptClick(ts)}
              disabled={isStreaming}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{'\uD83D\uDCDD'}</span>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {ts.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatDateTime(ts.lastModified)}</span>
                    <span className="text-gray-300 dark:text-gray-600">&middot;</span>
                    <span>{formatTimeAgo(ts.lastModified, t)}</span>
                  </div>
                </div>
              </div>
            </button>
            {/* Action buttons */}
            {confirmDeleteId === ts.id ? (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow px-1.5 py-1 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ts.id); }}
                  className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  {t('session.delete')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                  className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('plugin.cancel')}
                </button>
              </div>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(ts.id); }}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  title={t('session.editTitle')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ts.id); }}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
