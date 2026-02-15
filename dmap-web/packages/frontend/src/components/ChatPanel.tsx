import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useSkillStream } from '../hooks/useSkillStream.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import type { Translations } from '../i18n/types.js';
import { MessageBubble } from './MessageBubble.js';
import { ApprovalDialog } from './ApprovalDialog.js';
import { QuestionFormDialog } from './QuestionFormDialog.js';
import { ToolIndicator } from './ToolIndicator.js';
import { TurnApprovalBar } from './TurnApprovalBar.js';
import { FileBrowserDialog } from './FileBrowserDialog.js';
import { SessionList } from './SessionList.js';

const LINE_HEIGHT = 22;
const MIN_ROWS = 2;
const MAX_ROWS = 10;

export function ChatPanel() {
  const { selectedSkill, messages, isStreaming, pendingApproval, sessionId, selectedPlugin } = useAppStore();
  const { executeSkill, respondToApproval, stopStream } = useSkillStream();
  const { lang } = useLangStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [bottomInputValue, setBottomInputValue] = useState('');
  const [attachedPaths, setAttachedPaths] = useState<string[]>([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEscRef = useRef(0);
  const t = useT();

  const hasStarted = messages.length > 0 || isStreaming;

  const ALLOWED_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.pdf', '.txt', '.md', '.csv', '.json',
    '.yaml', '.yml', '.xml',
  ]);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFiles = useCallback(async (files: { name: string; data: string }[]) => {
    if (files.length === 0) return;
    try {
      const res = await fetch('/api/filesystem/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      if (res.ok) {
        const { paths } = await res.json();
        setAttachedPaths((prev) => [...prev, ...paths.filter((p: string) => !prev.includes(p))]);
      }
    } catch {
      // ignore upload errors
    }
  }, []);

  const fileToBase64 = useCallback(async (file: Blob, name: string) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return { name, data: btoa(binary) };
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const allowed: File[] = [];
    let hasRejected = false;

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        allowed.push(file);
      } else {
        hasRejected = true;
      }
    }

    if (hasRejected) {
      showToast(t('fileBrowser.unsupportedType'));
    }

    if (allowed.length === 0) return;

    const fileData = await Promise.all(
      allowed.map((file) => fileToBase64(file, file.name)),
    );
    await uploadFiles(fileData);
  }, [showToast, t, fileToBase64, uploadFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return; // text paste — let default behavior happen

    e.preventDefault(); // prevent image data from being pasted as text

    const fileData = await Promise.all(
      imageItems.map(async (item) => {
        const blob = item.getAsFile();
        if (!blob) return null;
        const ext = item.type.split('/')[1] || 'png';
        const name = `clipboard-${Date.now()}.${ext}`;
        return fileToBase64(blob, name);
      }),
    );

    const validFiles = fileData.filter((f): f is { name: string; data: string } => f !== null);
    await uploadFiles(validFiles);
  }, [fileToBase64, uploadFiles]);

  const handleFilesSelected = (filePaths: string[]) => {
    setAttachedPaths((prev) => [...prev, ...filePaths.filter((p) => !prev.includes(p))]);
    setShowFileBrowser(false);
  };

  const removePath = (index: number) => {
    setAttachedPaths((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath;

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ESC double-tap to stop streaming
  useEffect(() => {
    if (!isStreaming) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      if (now - lastEscRef.current < 500) {
        stopStream();
        lastEscRef.current = 0;
      } else {
        lastEscRef.current = now;
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isStreaming, stopStream]);

  const handleExecute = () => {
    if (!selectedSkill || isStreaming) return;
    if (selectedSkill.name === '__prompt__' && !inputValue.trim()) return;
    if (inputValue.trim()) {
      useAppStore.getState().addMessage({ role: 'user', content: inputValue.trim() });
    }
    executeSkill(selectedSkill.name, inputValue.trim() || undefined, attachedPaths.length > 0 ? attachedPaths : undefined);
    setInputValue('');
    setAttachedPaths([]);
  };

  const handleClear = () => {
    useAppStore.getState().clearChat();
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleBottomSend = () => {
    if (!selectedSkill || isStreaming || !bottomInputValue.trim()) return;
    useAppStore.getState().addMessage({ role: 'user', content: bottomInputValue.trim() });
    executeSkill(selectedSkill.name, bottomInputValue.trim(), attachedPaths.length > 0 ? attachedPaths : undefined);
    setBottomInputValue('');
    setAttachedPaths([]);
    if (bottomTextareaRef.current) {
      bottomTextareaRef.current.style.height = 'auto';
    }
  };

  const handleBottomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleBottomSend();
    }
  };

  if (!selectedSkill) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <div className="text-5xl mb-4">{'\u{1F528}'}</div>
          <h2 className="text-xl font-medium text-gray-600 dark:text-gray-400">{selectedPlugin?.displayNames?.[lang] || selectedPlugin?.name || 'Plugin'}</h2>
          <p className="mt-2">{t('chat.selectSkill')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-lg text-blue-600 dark:text-blue-400 font-medium text-sm">
            {t('chat.attachFile')}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {showFileBrowser && (
        <FileBrowserDialog
          onSelect={handleFilesSelected}
          onClose={() => setShowFileBrowser(false)}
        />
      )}
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedSkill.name === '__prompt__'
                ? `${selectedSkill.icon} ${t('prompt.title')}`
                : `${selectedSkill.icon} ${t(`skill.${selectedSkill.name}.name` as keyof Translations) || selectedSkill.displayName}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedSkill.name === '__prompt__'
                ? t('prompt.description')
                : t(`skill.${selectedSkill.name}.desc` as keyof Translations) || selectedSkill.description}
            </p>
          </div>
          <div className="flex gap-2">
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('chat.reset')}
              </button>
            )}
            {isStreaming && (
              <button
                onClick={stopStream}
                className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                {t('chat.stop')}
              </button>
            )}
          </div>
        </div>
        {!hasStarted && (
          <>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                autoResize(textareaRef.current);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={selectedSkill.name === '__prompt__' ? t('prompt.placeholder') : t('chat.inputPlaceholder')}
              rows={MIN_ROWS}
              style={{ lineHeight: `${LINE_HEIGHT}px`, maxHeight: LINE_HEIGHT * MAX_ROWS + 16 }}
              className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleExecute}
                disabled={isStreaming || (selectedSkill.name === '__prompt__' && !inputValue.trim())}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {selectedSkill.name === '__prompt__' ? t('prompt.run') : t('chat.run')}
              </button>
              <button
                onClick={() => setShowFileBrowser(true)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('chat.attachFile')}
              </button>
              {attachedPaths.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachedPaths.map((filePath, idx) => {
                    const name = getFileName(filePath);
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-full">
                        {name.length > 20 ? name.slice(0, 17) + '...' : name}
                        <button onClick={() => removePath(idx)} className="text-gray-400 hover:text-red-500">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 chat-scroll">
        {messages.length === 0 && !isStreaming && (
          <SessionList skillName={selectedSkill.name} />
        )}

        {messages.map((msg, idx) => {
          if (msg.toolName) {
            // Only the last tool message is active while streaming
            const isLastTool = isStreaming && !messages.slice(idx + 1).some((m) => m.toolName);
            return <ToolIndicator key={msg.id} name={msg.toolName} isActive={isLastTool} />;
          }
          return <MessageBubble key={msg.id} message={msg} />;
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {t('chat.processing')}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom input bar */}
      {hasStarted && !pendingApproval && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-3">
          <textarea
            ref={bottomTextareaRef}
            value={bottomInputValue}
            onChange={(e) => {
              setBottomInputValue(e.target.value);
              autoResize(bottomTextareaRef.current);
            }}
            onKeyDown={handleBottomKeyDown}
            onPaste={handlePaste}
            placeholder={t('chat.reply')}
            rows={1}
            disabled={isStreaming}
            style={{ lineHeight: `${LINE_HEIGHT}px`, maxHeight: LINE_HEIGHT * MAX_ROWS + 16 }}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 resize-none overflow-y-auto"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleBottomSend}
              disabled={isStreaming}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {t('chat.sendCtrlEnter')}
            </button>
            <button
              onClick={() => setShowFileBrowser(true)}
              disabled={isStreaming}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {t('chat.attachFile')}
            </button>
            {attachedPaths.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachedPaths.map((filePath, idx) => {
                  const name = getFileName(filePath);
                  return (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                      {name.length > 20 ? name.slice(0, 17) + '...' : name}
                      <button onClick={() => removePath(idx)} className="text-gray-400 hover:text-red-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval / Question Form */}
      {pendingApproval && sessionId && (
        pendingApproval.parsedQuestions ? (
          <QuestionFormDialog
            title={pendingApproval.question}
            questions={pendingApproval.parsedQuestions}
            onSubmit={(formatted) => {
              useAppStore.getState().setPendingApproval(null);
              useAppStore.getState().addMessage({ role: 'user', content: formatted });
              executeSkill(selectedSkill!.name, formatted);
            }}
            onClose={() => {
              useAppStore.getState().setPendingApproval(null);
              useAppStore.getState().addMessage({ role: 'system', content: `\u2705 ${t('chat.complete')}` });
            }}
          />
        ) : pendingApproval.isTurnApproval ? (
          <TurnApprovalBar
            question={pendingApproval.question}
            onApprove={(msg) => {
              useAppStore.getState().setPendingApproval(null);
              useAppStore.getState().addMessage({ role: 'user', content: msg });
              executeSkill(selectedSkill!.name, msg);
            }}
            onReject={() => {
              useAppStore.getState().setPendingApproval(null);
              useAppStore.getState().addMessage({ role: 'system', content: `\u2705 ${t('chat.complete')}` });
            }}
          />
        ) : (
          <ApprovalDialog
            approval={pendingApproval}
            onRespond={(answer) => respondToApproval(sessionId, pendingApproval.id, answer)}
          />
        )
      )}
    </div>
  );
}
