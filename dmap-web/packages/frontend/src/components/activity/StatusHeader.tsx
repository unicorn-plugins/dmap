import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore.js';
import { useActivityStore } from '../../stores/activityStore.js';
import { useT } from '../../i18n/index.js';
import { formatElapsed } from '../../utils/format.js';

export function StatusHeader() {
  const { isStreaming } = useAppStore();
  const { executionStartTime, executionEndTime, togglePanel } = useActivityStore();
  const t = useT();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!executionStartTime || executionEndTime) {
      if (executionStartTime && executionEndTime) {
        setElapsed(new Date(executionEndTime).getTime() - new Date(executionStartTime).getTime());
      }
      return;
    }
    const start = new Date(executionStartTime).getTime();
    setElapsed(Date.now() - start);
    const interval = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [executionStartTime, executionEndTime]);

  // Determine status
  const status = isStreaming ? 'running' : executionEndTime ? 'complete' : 'idle';
  const dotColor = status === 'running' ? 'bg-blue-500 animate-pulse'
    : status === 'complete' ? 'bg-green-500'
    : 'bg-gray-400';
  const statusText = status === 'running' ? t('activity.running')
    : status === 'complete' ? t('activity.complete')
    : t('activity.idle');

  return (
    <div className="px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">{statusText}</span>
          {executionStartTime && (
            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>
        <button
          onClick={togglePanel}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title={t('activity.toggle')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {/* Indeterminate progress bar */}
      {isStreaming && (
        <div className="mt-2 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-blue-500 rounded-full animate-progress-indeterminate" />
        </div>
      )}
    </div>
  );
}
