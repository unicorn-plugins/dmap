import { useActivityStore } from '../../stores/activityStore.js';
import { useT } from '../../i18n/index.js';
import { formatTime } from '../../utils/format.js';

const MODEL_COLORS: Record<string, string> = {
  haiku: 'bg-gray-500',
  sonnet: 'bg-blue-500',
  opus: 'bg-purple-600',
};

function parseAgentName(subagentType: string): string {
  // "oh-my-claudecode:executor" → "executor"
  const parts = subagentType.split(':');
  return parts[parts.length - 1] || subagentType;
}

export function AgentSection() {
  const { agentEvents } = useActivityStore();
  const t = useT();

  if (agentEvents.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
        {t('activity.agents.empty')}
      </div>
    );
  }

  return (
    <div className="px-4 pb-3 flex flex-col gap-2">
      {agentEvents.map((agent) => (
        <div key={agent.id} className="flex items-center gap-2.5 py-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white ${MODEL_COLORS[agent.model] || 'bg-gray-500'}`}>
            {agent.model}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {parseAgentName(agent.subagentType)}
            </span>
            {agent.description && (
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1.5 truncate">
                — {agent.description}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
            {formatTime(agent.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
