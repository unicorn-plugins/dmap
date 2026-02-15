import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';

export function ConfirmSwitchDialog() {
  const pendingSkillSwitch = useAppStore((s) => s.pendingSkillSwitch);
  const confirmSkillSwitch = useAppStore((s) => s.confirmSkillSwitch);
  const cancelSkillSwitch = useAppStore((s) => s.cancelSkillSwitch);
  const abortCurrentStream = useAppStore((s) => s.abortCurrentStream);
  const t = useT();

  if (!pendingSkillSwitch) return null;

  const handleConfirm = () => {
    abortCurrentStream();
    confirmSkillSwitch();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('switchDialog.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('switchDialog.message')}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={cancelSkillSwitch}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('switchDialog.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('switchDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
