import { useActivityStore } from '../../stores/activityStore.js';
import { useT } from '../../i18n/index.js';

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01';
  return '$' + usd.toFixed(2);
}

export function UsageFooter() {
  const { usage } = useActivityStore();
  const t = useT();

  if (!usage) return null;

  const totalTokens = usage.inputTokens + usage.outputTokens;

  return (
    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('activity.usage.tokens')}</span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
            {formatTokens(totalTokens)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('activity.usage.cost')}</span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
            {formatCost(usage.totalCostUsd)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('activity.usage.input')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {formatTokens(usage.inputTokens)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('activity.usage.output')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {formatTokens(usage.outputTokens)}
          </span>
        </div>
        {usage.cacheReadTokens > 0 && (
          <div className="flex justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('activity.usage.cacheRead')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {formatTokens(usage.cacheReadTokens)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('activity.usage.turns')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {usage.numTurns}
          </span>
        </div>
      </div>
    </div>
  );
}
