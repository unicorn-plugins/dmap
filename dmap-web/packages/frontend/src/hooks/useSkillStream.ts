import { useCallback, useRef } from 'react';
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
    switchSkillChain,
  } = useAppStore();

  const t = useT();
  const abortRef = useRef<AbortController | null>(null);
  const pendingQuestionsRef = useRef<{ title: string; questions: QuestionItem[] } | null>(null);
  const executionIdRef = useRef<string | null>(null);

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
        case 'complete': {
          // Don't overwrite session ID if a skill chain has already set a new one
          const currentSessionId = useAppStore.getState().sessionId;
          if (!currentSessionId || currentSessionId === event.sessionId) {
            setSessionId(event.sessionId);
          }
          fetchSkills();
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
    [appendToLastMessage, addMessage, setPendingApproval, setSessionId, setStreaming, fetchSkills, switchSkillChain, t],
  );

  const executeSkill = useCallback(
    async (skillName: string, args?: string, filePaths?: string[]) => {
      // Abort previous stream
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      pendingQuestionsRef.current = null;

      const executionId = crypto.randomUUID();
      executionIdRef.current = executionId;

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

          // SSE events are separated by double newlines
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventType = '';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                data = line.slice(6);
              }
            }

            if (!eventType || !data) continue;

            // Ignore events from stale executions
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

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    useAppStore.getState().abortCurrentStream();
    setStreaming(false);
  }, [setStreaming]);

  return { executeSkill, respondToApproval, stopStream };
}
