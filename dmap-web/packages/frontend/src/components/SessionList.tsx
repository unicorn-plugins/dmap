import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';
import type { Session } from '@dmap-web/shared';
import type { Translations } from '../i18n/types.js';

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

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m${remainSeconds > 0 ? ` ${remainSeconds}s` : ''}`;
}

function formatTokens(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  waiting: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

interface SessionListProps {
  skillName?: string;  // Filter by skill name. Omit to show all sessions.
}

export function SessionList({ skillName }: SessionListProps) {
  const { sessions, fetchSessions, deleteSession, resumeSession, skills, isStreaming } = useAppStore();
  const t = useT();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filtered = skillName
    ? sessions.filter(s => s.skillName === skillName)
    : sessions;

  const handleResume = useCallback((session: Session) => {
    if (isStreaming) return;
    const skill = session.skillName === '__prompt__'
      ? null
      : skills.find(s => s.name === session.skillName) || null;
    resumeSession(session, skill);
  }, [isStreaming, skills, resumeSession]);

  const handleDelete = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteSession(sessionId);
  }, [deleteSession]);

  if (filtered.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-12">
        <p>{t('session.empty')}</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {t('session.history')}
      </h3>
      <div className="space-y-2">
        {filtered.map((session) => {
          const statusKey = `session.status.${session.status}` as any;
          const totalTokens = session.usage
            ? session.usage.inputTokens + session.usage.outputTokens
            : 0;

          return (
            <button
              key={session.id}
              onClick={() => handleResume(session)}
              disabled={isStreaming}
              className="w-full text-left group relative px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="absolute top-2 right-2 p-1 rounded-full text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('session.delete')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-start gap-3">
                {/* Skill icon */}
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {session.skillIcon || (session.skillName === '__prompt__' ? '\u26A1' : '\uD83D\uDCC4')}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {session.preview || session.skillName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>{formatTimeAgo(session.lastActivity, t)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[session.status] || STATUS_STYLES.completed}`}>
                      {t(statusKey) || session.status}
                    </span>
                    {totalTokens > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>{formatTokens(totalTokens)} tok</span>
                      </>
                    )}
                    {session.usage?.totalCostUsd ? (
                      <>
                        <span>&middot;</span>
                        <span>${session.usage.totalCostUsd.toFixed(3)}</span>
                      </>
                    ) : null}
                    {session.usage?.durationMs ? (
                      <>
                        <span>&middot;</span>
                        <span>{formatDuration(session.usage.durationMs)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
