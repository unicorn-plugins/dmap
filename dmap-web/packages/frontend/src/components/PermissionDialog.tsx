/**
 * 도구 실행 권한 요청 다이얼로그 - 위험한 Bash 명령 실행 시 사용자 승인/거부
 * riskLevel에 따라 배경색 분기: warning=amber, danger=red
 * @module components/PermissionDialog
 */
import { useT } from '../i18n/index.js';

interface PermissionDialogProps {
  requestId: string;
  toolName: string;
  description: string;
  riskLevel: 'warning' | 'danger';
  onRespond: (requestId: string, decision: 'allow' | 'deny') => void;
}

export function PermissionDialog({ requestId, toolName, description, riskLevel, onRespond }: PermissionDialogProps) {
  const t = useT();
  const isDanger = riskLevel === 'danger';

  return (
    <div className={`border-t-2 ${isDanger ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'} px-6 py-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{isDanger ? '\u26A0\uFE0F' : '\u{1F6E1}\uFE0F'}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${isDanger ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
            {t('permission.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{toolName}</p>
          <pre className="mt-2 p-3 text-xs bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
            {description}
          </pre>
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button
          onClick={() => onRespond(requestId, 'deny')}
          className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {t('permission.deny')}
        </button>
        <button
          onClick={() => onRespond(requestId, 'allow')}
          className={`px-4 py-1.5 text-sm text-white rounded-lg transition-colors ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
        >
          {t('permission.allow')}
        </button>
      </div>
    </div>
  );
}
