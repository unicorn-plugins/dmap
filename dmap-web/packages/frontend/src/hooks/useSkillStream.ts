import { useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useT } from '../i18n/index.js';
import { useLangStore } from '../stores/langStore.js';
import { useActivityStore } from '../stores/activityStore.js';
import type { ApprovalOption, QuestionItem } from '@dmap-web/shared';

const API_BASE = '/api';

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
    (type: string, data: Record<string, unknown>) => {
      switch (type) {
        case 'text':
          appendToLastMessage(data.text as string);
          break;
        case 'tool': {
          const toolDesc = data.description ? `${data.name}: ${data.description}` : (data.name as string);
          addMessage({
            role: 'system',
            content: toolDesc,
            toolName: toolDesc,
          });
          useActivityStore.getState().addToolEvent(data.name as string, data.description as string | undefined);
          break;
        }
        case 'agent': {
          useActivityStore.getState().addAgentEvent(
            data.id as string,
            data.subagentType as string,
            data.model as string,
            data.description as string | undefined,
          );
          break;
        }
        case 'usage': {
          useActivityStore.getState().setUsage({
            inputTokens: data.inputTokens as number,
            outputTokens: data.outputTokens as number,
            cacheReadTokens: data.cacheReadTokens as number,
            cacheCreationTokens: data.cacheCreationTokens as number,
            totalCostUsd: data.totalCostUsd as number,
            durationMs: data.durationMs as number,
            numTurns: data.numTurns as number,
          });
          break;
        }
        case 'progress': {
          const steps = data.steps as Array<{ step: number; label: string }> | undefined;
          const activeStep = data.activeStep as number | undefined;
          if (steps) {
            useActivityStore.getState().setProgressSteps(steps);
          }
          if (activeStep) {
            useActivityStore.getState().setActiveStep(activeStep);
          }
          break;
        }
        case 'approval':
          setSessionId(data.sessionId as string);
          setPendingApproval({
            id: data.id as string,
            question: data.question as string,
            options: data.options as ApprovalOption[],
          });
          break;
        case 'questions':
          pendingQuestionsRef.current = {
            title: data.title as string,
            questions: data.questions as QuestionItem[],
          };
          break;
        case 'skill_changed': {
          const newSkillName = data.newSkillName as string;
          const newSessionId = data.newSessionId as string;
          const skills = useAppStore.getState().skills;
          const newSkill = skills.find((s) => s.name === newSkillName);
          if (newSkill && newSessionId) {
            switchSkillChain(newSkill, newSessionId);
          }
          break;
        }
        case 'complete': {
          // Don't overwrite session ID if a skill chain has already set a new one
          const currentSessionId = useAppStore.getState().sessionId;
          const completedSessionId = data.sessionId as string;
          if (!currentSessionId || currentSessionId === completedSessionId) {
            setSessionId(completedSessionId);
          }
          fetchSkills();
          const storedQuestions = pendingQuestionsRef.current;
          pendingQuestionsRef.current = null;
          const isFullyComplete = data.fullyComplete as boolean;

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
            content: `\u274C ${data.message as string}`,
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
              const parsed = JSON.parse(data);
              handleSSEEvent(eventType, parsed);
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
