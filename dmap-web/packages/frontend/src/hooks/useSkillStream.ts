/**
 * SSE 스트림 소비 훅 - 스킬 실행 결과를 실시간으로 수신하여 스토어에 반영
 *
 * 핵심 기능:
 * 1. executeSkill(): POST /api/skills/:name/execute → SSE 스트림 소비 → 이벤트별 스토어 액션 매핑
 * 2. respondToApproval(): 사용자 응답을 백엔드에 전달 (세션 재개)
 * 3. stopStream(): 현재 스트림 abort
 *
 * SSE 이벤트 → 스토어 액션 매핑:
 * - text → appStore.appendToLastMessage (채팅 메시지)
 * - tool → activityStore.addToolEvent (도구 활동)
 * - agent → activityStore.addAgentEvent (에이전트 활동)
 * - usage → activityStore.setUsage (토큰/비용)
 * - progress → activityStore.setProgressSteps/setActiveStep (진행률)
 * - questions → pendingQuestionsRef에 임시 저장 (complete 시 처리)
 * - skill_changed → appStore.switchSkillChain (스킬 체인 전환)
 * - complete → 질문 표시 또는 완료 메시지 + activityStore.endExecution
 *
 * @module hooks/useSkillStream
 */
import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import { useActivityStore } from '../stores/activityStore.js';
import { API_BASE } from '@dmap-web/shared';
import type { QuestionItem, SSEEvent } from '@dmap-web/shared';

export function useSkillStream() {
  const {
    setSessionId,
    addMessage,
    appendToLastMessage,
    setStreaming,
    setPendingApproval,
    fetchSkills,
    refreshMenus,
    switchSkillChain,
  } = useAppStore(useShallow((s) => ({
    setSessionId: s.setSessionId,
    addMessage: s.addMessage,
    appendToLastMessage: s.appendToLastMessage,
    setStreaming: s.setStreaming,
    setPendingApproval: s.setPendingApproval,
    fetchSkills: s.fetchSkills,
    refreshMenus: s.refreshMenus,
    switchSkillChain: s.switchSkillChain,
  })));

  const t = useT();
  /** 현재 SSE 스트림의 AbortController - 중복 실행 방지 및 stopStream용 */
  const abortRef = useRef<AbortController | null>(null);
  /** ASK_USER 질문 임시 저장소 - questions 이벤트에서 저장, complete 이벤트에서 처리 */
  const pendingQuestionsRef = useRef<{ title: string; questions: QuestionItem[] } | null>(null);
  /** 현재 실행 ID - stale 이벤트(이전 실행의 잔여 이벤트) 필터링용 */
  const executionIdRef = useRef<string | null>(null);
  /** 현재 실행 중인 스킬명 - ext-skill 완료 시 메뉴 갱신 트리거용 */
  const currentSkillRef = useRef<string | null>(null);

  /**
   * SSE 이벤트 핸들러 - 이벤트 타입별로 적절한 스토어 액션에 라우팅
   *
   * questions 이벤트는 즉시 UI에 표시하지 않고 pendingQuestionsRef에 저장.
   * complete 이벤트 수신 시 비로소 QuestionFormDialog 또는 완료 메시지를 표시.
   * 이유: questions 이벤트 후 추가 text 이벤트가 올 수 있으므로 complete까지 대기.
   */
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'text':
          appendToLastMessage(event.text);
          break;
        case 'tool': {
          const toolDesc = event.description ? `${event.name}: ${event.description}` : event.name;
          addMessage({
            role: 'system',
            content: toolDesc,
            toolName: toolDesc,
          });
          useActivityStore.getState().addToolEvent(event.name, event.description);
          break;
        }
        case 'agent': {
          useActivityStore.getState().addAgentEvent(
            event.id,
            event.subagentType,
            event.model,
            event.description,
          );
          break;
        }
        case 'usage': {
          useActivityStore.getState().setUsage({
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            cacheReadTokens: event.cacheReadTokens,
            cacheCreationTokens: event.cacheCreationTokens,
            totalCostUsd: event.totalCostUsd,
            durationMs: event.durationMs,
            numTurns: event.numTurns,
          });
          break;
        }
        case 'progress': {
          if (event.steps) {
            useActivityStore.getState().setProgressSteps(event.steps);
          }
          if (event.activeStep) {
            useActivityStore.getState().setActiveStep(event.activeStep);
          }
          break;
        }
        case 'approval':
          setSessionId(event.sessionId);
          setPendingApproval({
            id: event.id,
            question: event.question,
            options: event.options,
          });
          break;
        case 'questions':
          pendingQuestionsRef.current = {
            title: event.title,
            questions: event.questions,
          };
          break;
        case 'skill_changed': {
          const skills = useAppStore.getState().skills;
          const newSkill = skills.find((s) => s.name === event.newSkillName);
          if (newSkill && event.newSessionId) {
            switchSkillChain(newSkill, event.newSessionId);
          }
          break;
        }
        case 'permission_request': {
          useAppStore.getState().setPendingPermission({
            requestId: event.requestId,
            toolName: event.toolName,
            description: event.description,
            riskLevel: event.riskLevel,
          });
          break;
        }
        case 'skill_suggestion': {
          const allSkills = useAppStore.getState().skills;
          const suggested = allSkills.find((s) => s.name === event.suggestedSkill);
          const currentLang = useLangStore.getState().lang;
          const displayName = event.isPromptMode
            ? (currentLang === 'ko' ? '프롬프트' : 'Prompt')
            : (suggested?.displayName || event.suggestedSkill);

          useAppStore.getState().setSkillSuggestion({
            suggestedSkill: event.suggestedSkill,
            suggestedSkillDisplayName: displayName,
            reason: event.reason,
            isPromptMode: event.isPromptMode,
          });
          break;
        }
        case 'complete': {
          // Don't overwrite session ID if a skill chain has already set a new one
          const currentSessionId = useAppStore.getState().sessionId;
          if (!currentSessionId || currentSessionId === event.sessionId) {
            setSessionId(event.sessionId);
          }
          fetchSkills();
          // ext-skill 추가/삭제 완료 시 메뉴 갱신 (사이드바 동기화)
          const executedSkill = currentSkillRef.current;
          if (executedSkill === 'add-ext-skill' || executedSkill === 'remove-ext-skill') {
            refreshMenus();
          }
          const storedQuestions = pendingQuestionsRef.current;
          pendingQuestionsRef.current = null;
          const isFullyComplete = event.fullyComplete;

          // Mark all progress steps as complete when skill finishes
          if (isFullyComplete) {
            useActivityStore.getState().completeAllSteps();
          }

          if (storedQuestions && storedQuestions.questions.length > 0) {
            setPendingApproval({
              id: crypto.randomUUID(),
              question: storedQuestions.title,
              options: [],
              isTurnApproval: true,
              parsedQuestions: storedQuestions.questions,
            });
          } else if (!isFullyComplete && useAppStore.getState().selectedSkill?.hasApprovalGates) {
            setPendingApproval({
              id: crypto.randomUUID(),
              question: t('stream.respond'),
              options: [],
              isTurnApproval: true,
            });
          } else {
            addMessage({
              role: 'system',
              content: `\u2705 ${t('chat.complete')}`,
            });
          }
          useActivityStore.getState().endExecution();
          setStreaming(false);
          break;
        }
        case 'error':
          addMessage({
            role: 'system',
            content: `\u274C ${event.message}`,
          });
          break;
        case 'done':
          useActivityStore.getState().endExecution();
          setStreaming(false);
          break;
      }
    },
    [appendToLastMessage, addMessage, setPendingApproval, setSessionId, setStreaming, fetchSkills, refreshMenus, switchSkillChain, t],
  );

  /**
   * 스킬 실행 - SSE 스트리밍으로 백엔드와 연결
   *
   * 흐름: fetch POST → ReadableStream → SSE 파싱 → handleSSEEvent 라우팅
   * 이전 실행 abort → 새 AbortController 생성 → appStore에 등록 (ConfirmSwitchDialog용)
   * executionId로 stale 이벤트 필터링 (이전 실행의 잔여 데이터 무시)
   */
  const executeSkill = useCallback(
    async (skillName: string, args?: string, filePaths?: string[]) => {
      // Abort previous stream
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      pendingQuestionsRef.current = null;

      const executionId = crypto.randomUUID();
      executionIdRef.current = executionId;
      currentSkillRef.current = skillName;

      // Register abort controller in appStore for centralized abort (ConfirmSwitchDialog)
      useAppStore.getState().setStreamAbortController(abortRef.current);

      setStreaming(true);
      useActivityStore.getState().startExecution();

      try {
        const currentSessionId = useAppStore.getState().sessionId;
        const response = await fetch(`${API_BASE}/skills/${skillName}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: args,
            sessionId: currentSessionId,
            lang: useLangStore.getState().lang,
            pluginId: useAppStore.getState().selectedPlugin?.id,
            filePaths,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to execute skill: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE 프로토콜 파싱: \n\n으로 이벤트 분리 → event:/data: 라인 추출 → JSON 파싱
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventType = '';
            let data = '';

            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataLines.push(line.slice(6));
              }
            }
            data = dataLines.join('\n');

            if (!eventType || !data) continue;

            // executionId 불일치 = 이전 실행의 잔여 이벤트 → 무시하고 abort
            if (executionIdRef.current !== executionId) {
              abortRef.current?.abort();
              break;
            }

            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              handleSSEEvent({ type: eventType, ...parsed } as SSEEvent);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          addMessage({
            role: 'system',
            content: `${t('stream.error')} ${(error as Error).message}`,
          });
        }
      } finally {
        useActivityStore.getState().endExecution();
        setStreaming(false);
      }
    },
    [addMessage, setStreaming, handleSSEEvent, t],
  );

  /** 사용자 응답 전달 - 승인 해제 + 응답 메시지 추가 + 백엔드 세션에 응답 주입 */
  const respondToApproval = useCallback(
    async (sessionId: string, approvalId: string, answer: string) => {
      setPendingApproval(null);
      addMessage({ role: 'user', content: answer });

      await fetch(`${API_BASE}/sessions/${sessionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: answer }),
      });
    },
    [setPendingApproval, addMessage],
  );

  /** 도구 실행 권한 요청에 대한 사용자 응답 전달 */
  const respondToPermission = useCallback(
    async (requestId: string, decision: 'allow' | 'deny') => {
      useAppStore.getState().setPendingPermission(null);
      addMessage({
        role: 'system',
        content: `${decision === 'allow' ? '\u2705' : '\u274C'} Bash: ${decision === 'allow' ? 'approved' : 'denied'}`,
      });
      await fetch(`${API_BASE}/skills/permission-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision }),
      });
    },
    [addMessage],
  );

  /** 현재 스트림 강제 중단 - abortRef + appStore.abortCurrentStream 양쪽 abort */
  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    useAppStore.getState().abortCurrentStream();
    setStreaming(false);
  }, [setStreaming]);

  return { executeSkill, respondToApproval, respondToPermission, stopStream };
}
