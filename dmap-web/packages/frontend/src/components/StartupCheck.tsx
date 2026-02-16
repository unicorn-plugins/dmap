import { useState, useEffect, useCallback, useRef } from 'react';
import { useT } from '../i18n/index.js';
import { API_BASE } from '@dmap-web/shared';

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  fixable: boolean;
  fixAction?: string;
}

const CHECK_ICONS: Record<string, string> = {
  node: '\u{2B22}',
  node_modules: '\u{1F4C2}',
  claude_cli: '\u{1F916}',
  claude_auth: '\u{1F511}',
  omc: '\u{26A1}',
  omc_setup: '\u{2699}',
  dmap: '\u{1F9E9}',
};

interface Props {
  onReady: () => void;
}

export function StartupCheck({ onReady }: Props) {
  const t = useT();
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [allPassed, setAllPassed] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, 'success' | 'fail' | 'interactive'>>({});
  const [fadeOut, setFadeOut] = useState(false);
  const autoContinuedRef = useRef(false);

  const runChecks = useCallback(() => {
    setChecks([]);
    setIsDone(false);
    setAllPassed(false);
    setFixResults({});
    autoContinuedRef.current = false;

    const evtSource = new EventSource(`${API_BASE}/startup-check`);

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'check') {
        setChecks((prev) => [...prev, data.check]);
      } else if (data.type === 'done') {
        setAllPassed(data.allPassed);
        setIsDone(true);
        evtSource.close();
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      // Backend not ready yet — retry
      setTimeout(runChecks, 2000);
    };

    return () => evtSource.close();
  }, []);

  useEffect(() => {
    const cleanup = runChecks();
    return cleanup;
  }, [runChecks]);

  // Auto-continue when all passed
  useEffect(() => {
    if (isDone && allPassed && !autoContinuedRef.current) {
      autoContinuedRef.current = true;
      setTimeout(() => handleContinue(), 600);
    }
  }, [isDone, allPassed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFix = async (action: string, checkId: string) => {
    setFixing(checkId);
    try {
      const res = await fetch(`${API_BASE}/startup-check/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (result.interactive) {
        setFixResults((prev) => ({ ...prev, [checkId]: 'interactive' }));
      } else {
        setFixResults((prev) => ({ ...prev, [checkId]: result.success ? 'success' : 'fail' }));
      }
    } catch {
      setFixResults((prev) => ({ ...prev, [checkId]: 'fail' }));
    } finally {
      setFixing(null);
    }
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(onReady, 600);
  };

  const hasFails = checks.some((c) => c.status === 'fail');
  const isLoading = checks.length === 0 && !isDone;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">DMAP Builder</h1>
          <p className="text-gray-400">
            {isDone ? t('startup.subtitle') : t('startup.checking')}
          </p>
        </div>

        {/* Check items */}
        <div className="space-y-3 mb-10">
          {checks.map((check) => {
            const icon = CHECK_ICONS[check.id] || '\u{2699}';
            const fixResult = fixResults[check.id];
            const isFixing = fixing === check.id;

            return (
              <div
                key={check.id}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all duration-500 opacity-100 translate-y-0 animate-fade-in ${
                  check.status === 'pass'
                    ? 'bg-gray-800/50 border-gray-700/50'
                    : check.status === 'warning'
                      ? 'bg-yellow-900/20 border-yellow-700/30'
                      : 'bg-red-900/20 border-red-700/30'
                }`}
              >
                {/* Icon */}
                <span className="text-lg w-7 text-center shrink-0">{icon}</span>

                {/* Label & Detail */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{check.label}</div>
                  <div className={`text-xs truncate ${
                    check.status === 'pass' ? 'text-gray-400' : check.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {fixResult === 'interactive' ? t('startup.runInTerminal') : check.detail}
                  </div>
                </div>

                {/* Status / Fix button */}
                <div className="shrink-0 flex items-center gap-2">
                  {check.status === 'fail' && check.fixable && !fixResult && (
                    <button
                      onClick={() => handleFix(check.fixAction!, check.id)}
                      disabled={isFixing}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                    >
                      {isFixing ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {t('startup.fixing')}
                        </span>
                      ) : (
                        t('startup.fix')
                      )}
                    </button>
                  )}
                  {fixResult === 'success' && (
                    <span className="text-xs text-green-400">{t('startup.fixSuccess')}</span>
                  )}
                  {fixResult === 'fail' && (
                    <span className="text-xs text-red-400">{t('startup.fixFail')}</span>
                  )}
                  {/* Status icon */}
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full ${
                    check.status === 'pass' || fixResult === 'success'
                      ? 'text-green-400'
                      : check.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                    {check.status === 'pass' || fixResult === 'success' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : check.status === 'warning' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Bottom actions */}
        {isDone && !allPassed && (
          <div className="text-center space-y-4 animate-fade-in">
            {/* Status message */}
            <p className={`text-sm font-medium ${hasFails ? 'text-yellow-400' : 'text-green-400'}`}>
              {hasFails ? t('startup.hasFails') : t('startup.allPassed')}
            </p>

            {/* Buttons */}
            <div className="flex justify-center gap-3">
              {hasFails && (
                <button
                  onClick={runChecks}
                  className="px-6 py-2.5 text-sm font-medium rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
                >
                  {t('startup.retry')}
                </button>
              )}
              <button
                onClick={handleContinue}
                className="px-8 py-2.5 text-sm font-medium rounded-xl transition-all bg-gray-700 hover:bg-gray-600 text-gray-300"
              >
                {t('startup.continue')}
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${allPassed ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${(checks.filter((c) => c.status !== 'fail').length / checks.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
