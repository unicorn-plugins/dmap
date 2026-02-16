import { useRef, useEffect } from 'react';
import { useActivityStore } from '../../stores/activityStore.js';
import { useT } from '../../i18n/index.js';
import { formatTime } from '../../utils/format.js';

const TOOL_COLORS: Record<string, string> = {
  Read: 'bg-green-500',
  Write: 'bg-blue-500',
  Edit: 'bg-blue-500',
  Bash: 'bg-amber-500',
  Glob: 'bg-purple-500',
  Grep: 'bg-purple-500',
  Task: 'bg-orange-500',
  WebFetch: 'bg-cyan-500',
  WebSearch: 'bg-cyan-500',
};

function getToolColor(name: string): string {
  return TOOL_COLORS[name] || 'bg-gray-400';
}

export function ToolSection() {
  const { toolView, setToolView, toolCounts, toolEvents } = useActivityStore();
  const t = useT();
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll feed to bottom when new events arrive
  useEffect(() => {
    if (toolView === 'feed' && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [toolEvents, toolView]);

  const isEmpty = Object.keys(toolCounts).length === 0;

  return (
    <div className="flex flex-col gap-3 px-4 pb-3">
      {/* Tab Bar */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setToolView('summary')}
          className={`pb-2 px-1 text-sm transition-colors ${
            toolView === 'summary'
              ? 'text-blue-600 dark:text-blue-400 font-medium border-b-2 border-blue-600'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          {t('activity.tools.summary')}
        </button>
        <button
          onClick={() => setToolView('feed')}
          className={`pb-2 px-1 text-sm transition-colors ${
            toolView === 'feed'
              ? 'text-blue-600 dark:text-blue-400 font-medium border-b-2 border-blue-600'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          {t('activity.tools.feed')}
        </button>
      </div>

      {/* Content */}
      {isEmpty && toolView === 'summary' ? (
        <div className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">—</div>
      ) : toolView === 'summary' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
          {Object.entries(toolCounts).map(([name, count]) => (
            <div
              key={name}
              className="flex items-center gap-1.5 p-2 rounded bg-gray-50 dark:bg-gray-800/50"
            >
              <div className={`w-2 h-2 rounded-full ${getToolColor(name)}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                {name}
              </span>
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                {count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto activity-scroll">
          {toolEvents.slice(-50).map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded transition-colors"
            >
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">
                {formatTime(event.timestamp)}
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                {event.name}
              </span>
              {event.description && (
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {event.description}
                </span>
              )}
            </div>
          ))}
          <div ref={feedEndRef} />
        </div>
      )}
    </div>
  );
}
