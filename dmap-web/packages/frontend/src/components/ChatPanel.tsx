/**
 * 채팅 패널 컴포넌트 - 스킬 실행의 메인 인터랙션 영역.
 * 상단 입력 → 메시지 목록 → 하단 멀티턴 입력 → 승인/질문 다이얼로그로 구성
 * @module components/ChatPanel
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore.js';
import { useSkillStream } from '../hooks/useSkillStream.js';
import { useFileAttachment } from '../hooks/useFileAttachment.js';
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
import { RelevanceBanner } from './RelevanceBanner.js';
import { PermissionDialog } from './PermissionDialog.js';
import { PROMPT_SKILL } from '@dmap-web/shared';
import { useSlashCommandMenu } from './SlashCommandMenu.js';

/** textarea 자동 크기 조절 상수 - 줄 높이(px), 최소/최대 행 수 */
const LINE_HEIGHT = 22;
const MIN_ROWS = 2;
const MAX_ROWS = 10;

/**
 * 채팅 패널 - 스킬 선택 시 표시되는 메인 대화 영역.
 * 구조: 헤더(스킬 정보+초기 입력) → 메시지 목록(스크롤) → 하단 입력(멀티턴) → 승인 다이얼로그
 */
export function ChatPanel() {
  const { selectedSkill, messages, isStreaming, pendingApproval, pendingPermission, sessionId, selectedPlugin, isTranscriptView, clearTranscriptView, skillSuggestion, transcriptId, transcriptSummary } = useAppStore(useShallow((s) => ({
    selectedSkill: s.selectedSkill,
    messages: s.messages,
    isStreaming: s.isStreaming,
    pendingApproval: s.pendingApproval,
    pendingPermission: s.pendingPermission,
    sessionId: s.sessionId,
    selectedPlugin: s.selectedPlugin,
    isTranscriptView: s.isTranscriptView,
    clearTranscriptView: s.clearTranscriptView,
    skillSuggestion: s.skillSuggestion,
    transcriptId: s.transcriptId,
    transcriptSummary: s.transcriptSummary,
  })));
  const { executeSkill, respondToApproval, respondToPermission, stopStream } = useSkillStream();
  const { lang } = useLangStore();
  const {
    attachedPaths, showFileBrowser, setShowFileBrowser, isDragging, toast,
    dragProps, handlePaste, handleFilesSelected, removePath, clearAttachments, getFileName,
  } = useFileAttachment();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [bottomInputValue, setBottomInputValue] = useState('');
  const lastEscRef = useRef(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const t = useT();

  // 슬래시 명령 자동완성
  const { menuElement: slashMenu, handleKeyDown: handleSlashKeyDown } = useSlashCommandMenu({
    inputValue,
    skills: useAppStore.getState().skills,
    isPromptMode: selectedSkill?.name === '__prompt__',
    onSelect: (cmd) => setInputValue(cmd),
  });

  // 대화 시작 여부 판별 - 메시지 존재 or 스트리밍 중 or 트랜스크립트 뷰
  const hasStarted = messages.length > 0 || isStreaming || isTranscriptView;

  /** 트랜스크립트 제목 인라인 저장 */
  const handleTitleSave = useCallback(async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed || !transcriptId) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const pluginId = selectedPlugin?.id;
      const url = pluginId
        ? `/api/transcripts/${transcriptId}/title?pluginId=${pluginId}`
        : `/api/transcripts/${transcriptId}/title`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        useAppStore.setState({ transcriptSummary: trimmed });
      }
    } catch { /* ignore */ }
    setIsEditingTitle(false);
  }, [editTitleValue, transcriptId, selectedPlugin?.id]);

  /**
   * textarea 자동 높이 조절 - 내용에 따라 MIN~MAX 행 범위 내에서 동적 리사이즈
   */
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * ESC 더블탭 스트리밍 중단 - 500ms 이내 ESC 2번 입력 시 스트림 종료
   */
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

  /**
   * 스킬 실행 핸들러 - 사용자 입력을 메시지에 추가하고 SSE 스트리밍으로 스킬 실행 시작
   */
  const handleExecute = () => {
    if (!selectedSkill || isStreaming) return;
    const trimmed = inputValue.trim();
    if (selectedSkill.name === '__prompt__' && !trimmed) return;

    // 프롬프트 모드에서 슬래시 커맨드 감지 → 해당 스킬로 라우팅
    if (selectedSkill.name === PROMPT_SKILL.name && trimmed.startsWith('/')) {
      // 1차: 콜론 포함 패턴 /pluginId:skillName (예: /dmap:help)
      const colonMatch = trimmed.match(/^\/([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
      // 2차: 콜론 없는 패턴 /skillName (예: /help, /develop-plugin)
      const bareMatch = !colonMatch ? trimmed.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/) : null;
      const matchedName = colonMatch?.[1] || bareMatch?.[1];
      const matchedArgs = (colonMatch?.[2] || bareMatch?.[2])?.trim() || undefined;

      if (matchedName) {
        const { skills } = useAppStore.getState();
        const targetSkill = skills.find(s => s.name === matchedName);
        if (targetSkill) {
          useAppStore.getState().selectSkill(targetSkill);
          if (matchedArgs) {
            useAppStore.getState().addMessage({ role: 'user', content: matchedArgs });
          }
          executeSkill(targetSkill.name, matchedArgs, attachedPaths.length > 0 ? attachedPaths : undefined);
          setInputValue('');
          clearAttachments();
          return;
        }
      }
      // DMAP 스킬에 없는 슬래시 커맨드(OMC, Claude Code 내장 등)는
      // __prompt__ 경로로 진행 → 백엔드에서 Skill 도구 호출로 변환
    }

    if (trimmed) {
      useAppStore.getState().addMessage({ role: 'user', content: trimmed });
    }
    executeSkill(selectedSkill.name, trimmed || undefined, attachedPaths.length > 0 ? attachedPaths : undefined);
    setInputValue('');
    clearAttachments();
  };

  /**
   * 대화 초기화 - 메시지 목록과 입력값 모두 클리어
   */
  const handleClear = () => {
    useAppStore.getState().clearChat();
    setInputValue('');
  };

  /**
   * 키보드 단축키 - Ctrl+Enter로 실행 트리거
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 슬래시 명령 메뉴가 열려있으면 메뉴 키보드 이벤트 우선 처리
    if (handleSlashKeyDown(e)) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExecute();
    }
  };

  /**
   * 하단 멀티턴 입력 전송 - 트랜스크립트 뷰 해제 후 대화 계속
   */
  const handleBottomSend = () => {
    if (!selectedSkill || isStreaming || !bottomInputValue.trim()) return;
    // Exit transcript view on send - conversation continues as multi-turn
    if (isTranscriptView) {
      useAppStore.setState({ isTranscriptView: false });
    }
    useAppStore.getState().addMessage({ role: 'user', content: bottomInputValue.trim() });
    executeSkill(selectedSkill.name, bottomInputValue.trim(), attachedPaths.length > 0 ? attachedPaths : undefined);
    setBottomInputValue('');
    clearAttachments();
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
      // 스킬 미선택 시 플러그인 이름과 안내 메시지 표시
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
      {...dragProps}
    >
      {/* 파일 드래그 시 시각적 피드백 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-lg text-blue-600 dark:text-blue-400 font-medium text-sm">
            {t('chat.attachFile')}
          </div>
        </div>
      )}

      {/* 일시적 알림 메시지 (파일 첨부 결과 등) */}
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
      {/* 헤더: 스킬 정보 표시 + 트랜스크립트/초기화/중단 버튼 + 초기 입력 영역 */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            {isTranscriptView ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{'\uD83D\uDCDD'}</span>
                  {isEditingTitle ? (
                    <input
                      autoFocus
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); }
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      onBlur={handleTitleSave}
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-blue-400 dark:border-blue-500 outline-none py-0 min-w-[200px]"
                      placeholder={t('session.editPlaceholder')}
                    />
                  ) : (
                    <h2
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/title"
                      onClick={() => { setEditTitleValue(transcriptSummary); setIsEditingTitle(true); }}
                      title={t('session.editTitle')}
                    >
                      {transcriptSummary || t('session.claudeCode')}
                      <svg className="w-3.5 h-3.5 inline-block ml-1.5 opacity-0 group-hover/title:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </h2>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('session.transcriptView')}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedSkill.name === '__prompt__'
                    ? `${selectedSkill.icon} ${t('prompt.title')}`
                    : <>{selectedSkill.icon} <span className="text-gray-400 dark:text-gray-500 font-normal">[{selectedSkill.name}]</span> {t(`skill.${selectedSkill.name}.name` as keyof Translations) || selectedSkill.displayName}</>}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedSkill.name === '__prompt__'
                    ? t('prompt.description')
                    : t(`skill.${selectedSkill.name}.desc` as keyof Translations) || selectedSkill.description}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isTranscriptView && (
              <button
                onClick={clearTranscriptView}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('session.backToList')}
              </button>
            )}
            {!isTranscriptView && messages.length > 0 && !isStreaming && (
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
        {!hasStarted && !isTranscriptView && (
          <>
            <div className="relative">
              {slashMenu}
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
            </div>
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

      {/* 메시지 목록: 세션 목록(빈 상태) → 메시지 버블 + 도구 인디케이터 → 스트리밍 표시기 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 chat-scroll">
        {skillSuggestion && (
          <RelevanceBanner
            suggestedSkillDisplayName={skillSuggestion.suggestedSkillDisplayName}
            reason={skillSuggestion.reason}
            isPromptMode={skillSuggestion.isPromptMode}
            onSwitch={() => {
              useAppStore.getState().abortCurrentStream();
              const targetSkill = skillSuggestion.isPromptMode
                ? PROMPT_SKILL
                : useAppStore.getState().skills.find(s => s.name === skillSuggestion.suggestedSkill);
              if (targetSkill) {
                useAppStore.getState().selectSkill(targetSkill);
              }
              useAppStore.getState().dismissSkillSuggestion();
            }}
            onDismiss={() => useAppStore.getState().dismissSkillSuggestion()}
          />
        )}

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

      {/* 하단 멀티턴 입력바 - 대화 진행 중 추가 입력 전송 영역 */}
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

      {/* 도구 실행 권한 요청 다이얼로그 */}
      {pendingPermission && (
        <PermissionDialog
          requestId={pendingPermission.requestId}
          toolName={pendingPermission.toolName}
          description={pendingPermission.description}
          riskLevel={pendingPermission.riskLevel}
          onRespond={respondToPermission}
        />
      )}

      {/* 승인 다이얼로그: QuestionFormDialog(구조화 질문) / TurnApprovalBar(턴 승인) / ApprovalDialog(일반 승인) */}
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
