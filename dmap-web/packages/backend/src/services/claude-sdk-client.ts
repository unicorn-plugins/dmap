import { readFile, mkdir, appendFile } from 'fs/promises';
import path from 'path';
import type { SSEEvent, QuestionItem } from '@dmap-web/shared';
import { loadOmcAgents, getSkillPatterns, type OmcAgentDef } from './omc-integration.js';
import { loadRegisteredAgents } from './agent-registry.js';

let logFilePath: string | null = null;

async function initLog(dmapProjectDir: string, skillName: string): Promise<void> {
  const logsDir = path.join(dmapProjectDir, '.dmap', 'logs');
  await mkdir(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  logFilePath = path.join(logsDir, `${ts}_${skillName}.log`);
  await appendFile(logFilePath, `=== ${skillName} started at ${new Date().toISOString()} ===\n`);
}

async function log(label: string, data?: unknown): Promise<void> {
  if (!logFilePath) return;
  const line = data !== undefined
    ? `[${new Date().toISOString()}] ${label}: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`
    : `[${new Date().toISOString()}] ${label}\n`;
  await appendFile(logFilePath, line).catch(() => {});
}

export interface StreamCallbacks {
  onEvent: (event: SSEEvent) => void;
  onSessionId?: (sessionId: string) => void;
}

interface RunQueryResult {
  hasContent: boolean;
  sdkSessionId?: string;
  pendingQuestions?: {
    title: string;
    questions: QuestionItem[];
  };
}

const ASK_USER_REGEX_G = /<!--ASK_USER-->\s*([\s\S]*?)\s*<!--\/ASK_USER-->/g;

function parseSkillSteps(skillContent: string): { steps: Array<{ step: number; label: string }>; isPhaseMode: boolean } | null {
  // Try Phase pattern first (higher-level grouping like develop-plugin)
  const phasePattern = /^###\s+Phase\s+(\d+)[:.]\s*(.+)$/gm;
  let matches = [...skillContent.matchAll(phasePattern)];
  if (matches.length >= 2) {
    return {
      isPhaseMode: true,
      steps: matches.map(m => ({
        step: parseInt(m[1], 10),
        label: m[2].replace(/\s*→\s*Agent:.*$/, '').replace(/\s*\(.*?\)\s*$/, '').replace(/\s*--\s*.+$/, '').trim(),
      })),
    };
  }

  // Try Step pattern (like team-planner, publish)
  const stepPattern = /^###\s+Step\s+(\d+)[:.]\s*(.+)$/gm;
  matches = [...skillContent.matchAll(stepPattern)];
  if (matches.length >= 2) {
    return {
      isPhaseMode: false,
      steps: matches.map(m => ({
        step: parseInt(m[1], 10),
        label: m[2].replace(/\s*→\s*Agent:.*$/, '').replace(/\s*\(.*?\)\s*$/, '').replace(/\s*--\s*.+$/, '').trim(),
      })),
    };
  }

  return null;
}

function detectStepFromText(text: string, isPhaseMode: boolean): number | null {
  const keyword = isPhaseMode ? 'Phase' : 'Step';
  const regex = new RegExp(`${keyword}\\s+(\\d+)`, 'gi');
  const matches = [...text.matchAll(regex)];
  if (matches.length > 0) {
    return Math.max(...matches.map(m => parseInt(m[1], 10)));
  }
  return null;
}

function extractAskUserBlocks(text: string): { cleanText: string; title: string; questions: any[] } | null {
  const matches = [...text.matchAll(ASK_USER_REGEX_G)];
  if (matches.length === 0) return null;

  const allQuestions: any[] = [];
  let title = '질문';

  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed.title) title = parsed.title;
      if (Array.isArray(parsed.questions)) allQuestions.push(...parsed.questions);
    } catch (e) {
      console.error('[SDK] Failed to parse ASK_USER JSON:', e);
    }
  }

  if (allQuestions.length === 0) return null;

  const cleanText = text.replace(ASK_USER_REGEX_G, '').trim();
  return { cleanText, title, questions: allQuestions };
}

function detectSkillChainCommand(text: string): { skillName: string; input?: string } | null {
  // Detect Skill tool invocation pattern: /pluginId:skill-name at line start
  const slashPattern = /^\/([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)(?:\s+(.+))?/m;
  const match = text.match(slashPattern);
  if (match) {
    return { skillName: match[2], input: match[3]?.trim() };
  }
  return null;
}

const ASK_USER_INSTRUCTION = `
CRITICAL INSTRUCTION - USER INTERACTION FORMAT:
You do NOT have access to the AskUserQuestion tool. It is disabled in this environment.
When you need to ask the user questions or collect input, you MUST use the following HTML comment format.
Do NOT write questions as plain text. Do NOT use numbered lists for questions. ALWAYS wrap questions in the <!--ASK_USER--> block.

FORMAT (use exactly this structure):
<!--ASK_USER-->
{"title":"섹션 제목","questions":[
  {"question":"자유 입력 질문","description":"상세 설명","type":"text","suggestion":"제안값","example":"예시값"},
  {"question":"하나만 선택","description":"설명","type":"radio","options":["옵션A","옵션B","옵션C"]},
  {"question":"복수 선택 가능","description":"설명","type":"checkbox","options":["항목1","항목2","항목3"]}
]}
<!--/ASK_USER-->

Rules:
- CRITICAL: Put ALL questions in a SINGLE <!--ASK_USER--> block. Do NOT use multiple blocks.
- CRITICAL: Do NOT ask questions as plain text. ALWAYS use the <!--ASK_USER--> format above.
- CRITICAL: Do NOT use the AskUserQuestion tool. It will fail. Use ONLY the <!--ASK_USER--> format.
- type "text": free text input. Use ONLY when the answer is completely open-ended with no predictable options (e.g., project name, free description).
- type "radio": single selection. Use when only ONE choice allowed from a known set.
- type "checkbox": multiple selection. Use when MULTIPLE choices allowed from a known set.
- PREFER radio/checkbox over text whenever you can enumerate reasonable options.
- "suggestion" sets default value for text fields, "example" sets placeholder hint.
- Do NOT add "직접 지정", "직접 입력", or "기타" options. The UI adds a custom input field automatically.
- Output your explanation text normally before the JSON block. Do NOT use numbered plain text questions.
- If you need to ask even ONE question, use this format. No exceptions.`;

const SKILL_CHAIN_FILE_CONVENTION = `
SKILL CHAIN FILE CONVENTION:
When your skill work is complete and you are about to chain to another skill using /pluginId:skill-name:
1. BEFORE outputting the chain command, save your key results/output to: ./output/{current-skill-name}-result.md (relative to the project root)
2. Use the Write tool to create this file in the project directory
3. The file should contain all essential outputs that the next skill needs to continue the workflow
4. Then output the chain command as usual

When a previous skill's result file path is provided below, read that file FIRST to get context from the previous skill before starting your own workflow. If the file does not exist, proceed with your workflow without previous context.`;

async function runQuery(
  prompt: string,
  options: Record<string, unknown>,
  callbacks: StreamCallbacks,
  externalAbortController?: AbortController,
): Promise<RunQueryResult> {
  const { query } = await import('@anthropic-ai/claude-code');

  const abortController = externalAbortController || new AbortController();
  options.abortController = abortController;

  let hasContent = false;
  let sdkSessionId: string | undefined;
  let pendingQuestions: RunQueryResult['pendingQuestions'] = undefined;

  for await (const message of query({
    prompt,
    options: options as any,
  })) {
    if (abortController.signal.aborted) break;

    console.log(`[SDK] message.type=${message.type}`, JSON.stringify(message).slice(0, 500));
    await log(`message.type=${message.type}`, message);

    // Capture session ID from system init
    if (message.type === 'system') {
      const sysMsg = message as any;
      if (sysMsg.session_id) {
        sdkSessionId = sysMsg.session_id;
      }
    }

    // Assistant messages with content blocks
    if (message.type === 'assistant') {
      const assistantMsg = message as any;
      const content = assistantMsg.message?.content ?? assistantMsg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            // Detect skill chain command (e.g., /dmap:develop-plugin)
            const chainCommand = detectSkillChainCommand(block.text);
            if (chainCommand) {
              console.log(`[SDK] Detected skill chain: → ${chainCommand.skillName}`);
              await log('skill_chain_detected', chainCommand);
              callbacks.onEvent({
                type: 'skill_changed',
                newSkillName: chainCommand.skillName,
                chainInput: chainCommand.input || '',
              } as any);
              // Abort current execution to prevent complete event conflict
              abortController.abort();
              return { hasContent, sdkSessionId, pendingQuestions };
            }

            const extracted = extractAskUserBlocks(block.text);
            if (extracted) {
              if (extracted.cleanText) {
                hasContent = true;
                callbacks.onEvent({ type: 'text', text: extracted.cleanText });
              }
              pendingQuestions = { title: extracted.title, questions: extracted.questions };
              console.log(`[SDK] Parsed ${extracted.questions.length} structured questions`);
              await log('parsed_questions', pendingQuestions);
            } else {
              hasContent = true;
              callbacks.onEvent({ type: 'text', text: block.text });
            }
          } else if (block.type === 'tool_use') {
            if (block.name === 'AskUserQuestion') {
              // AskUserQuestion detected - abort is REQUIRED to prevent CLI deadlock
              // (CLI waits for tool_result indefinitely without abort)
              console.warn(`[SDK] AskUserQuestion tool detected. Aborting and converting to pendingQuestions.`);
              await log('askUserQuestion_converted', block.input);

              // Convert AskUserQuestion data to pendingQuestions format
              const askQuestions = block.input?.questions || [];
              if (askQuestions.length > 0) {
                pendingQuestions = {
                  title: askQuestions[0]?.question || '질문',
                  questions: askQuestions.map((q: any) => ({
                    question: q.question || '',
                    description: q.description || '',
                    type: q.options ? 'radio' as const : 'text' as const,
                    options: (q.options || []).map((o: any) =>
                      typeof o === 'string' ? o : o.label || ''
                    ),
                    suggestion: '',
                    example: '',
                  })),
                };
              }

              abortController.abort();
              // Return with pendingQuestions (NOT askUserQuestion) so executeSkill
              // routes through the working path (QuestionFormDialog) instead of
              // the broken path (ApprovalDialog + waitForUserResponse)
              return { hasContent, sdkSessionId, pendingQuestions };
            }
            // Emit agent event for Task delegations
            if (block.name === 'Task') {
              const taskInput = block.input as Record<string, unknown> | undefined;
              if (taskInput) {
                // Infer model from agent name suffix when not explicitly set
                let model = taskInput.model as string | undefined;
                if (!model) {
                  const agentName = String(taskInput.subagent_type || '').split(':').pop() || '';
                  if (agentName.endsWith('-low')) model = 'haiku';
                  else if (agentName.endsWith('-high')) model = 'opus';
                  else model = 'sonnet';
                }
                callbacks.onEvent({
                  type: 'agent',
                  id: block.id,
                  subagentType: String(taskInput.subagent_type || 'unknown'),
                  model,
                  description: String(taskInput.description || ''),
                });
              }
            }
            // Extract short description from tool input
            const input = block.input as Record<string, unknown> | undefined;
            let desc = '';
            if (input) {
              if (block.name === 'Bash') desc = String(input.command || '').slice(0, 80);
              else if (block.name === 'Read') desc = String(input.file_path || '').split(/[\\/]/).pop() || '';
              else if (block.name === 'Write' || block.name === 'Edit') desc = String(input.file_path || '').split(/[\\/]/).pop() || '';
              else if (block.name === 'Grep') desc = String(input.pattern || '');
              else if (block.name === 'Glob') desc = String(input.pattern || '');
              else if (block.name === 'Task') desc = String(input.description || '');
            }
            callbacks.onEvent({ type: 'tool', name: block.name, id: block.id, description: desc || undefined });
          }
        }
      }
    }

    // Result: process usage and session ID only (text already emitted in assistant message)
    if (message.type === 'result') {
      const resultMsg = message as any;
      // Emit usage data
      if (resultMsg.total_cost_usd !== undefined || resultMsg.usage) {
        const usageData = (resultMsg.usage || {}) as Record<string, number>;
        callbacks.onEvent({
          type: 'usage',
          inputTokens: usageData.input_tokens || 0,
          outputTokens: usageData.output_tokens || 0,
          cacheReadTokens: usageData.cache_read_input_tokens || 0,
          cacheCreationTokens: usageData.cache_creation_input_tokens || 0,
          totalCostUsd: (resultMsg.total_cost_usd as number) || 0,
          durationMs: (resultMsg.duration_ms as number) || 0,
          numTurns: (resultMsg.num_turns as number) || 0,
        });
      }
      if (resultMsg.session_id) {
        sdkSessionId = resultMsg.session_id;
        callbacks.onSessionId?.(resultMsg.session_id);
      }
    }
  }

  return { hasContent, sdkSessionId, pendingQuestions };
}

export interface ExecuteSkillResult {
  fullyComplete: boolean;
}

export async function executeSkill(
  skillName: string,
  input: string | undefined,
  dmapProjectDir: string,
  lang: string | undefined,
  callbacks: StreamCallbacks,
  resumeSessionId?: string,
  pluginId?: string,
  filePaths?: string[],
  abortController?: AbortController,
  previousSkillName?: string,
): Promise<ExecuteSkillResult> {
  // Always read SKILL.md (needed for appendSystemPrompt on every call, including resume)
  const skillPath = path.join(dmapProjectDir, 'skills', skillName, 'SKILL.md');
  let skillContent = '';
  try {
    skillContent = await readFile(skillPath, 'utf-8');
    console.log(`[SDK] Loaded SKILL.md for "${skillName}" (${skillContent.length} chars)`);
  } catch {
    console.error(`[SDK] SKILL.md not found at ${skillPath}`);
    callbacks.onEvent({ type: 'error', message: `Skill "${skillName}" not found` });
    return { fullyComplete: true };
  }

  // Parse steps from SKILL.md for progress tracking
  const parsedSkillSteps = parseSkillSteps(skillContent);
  if (parsedSkillSteps) {
    console.log(`[SDK] Parsed ${parsedSkillSteps.steps.length} ${parsedSkillSteps.isPhaseMode ? 'phases' : 'steps'} from SKILL.md`);
    callbacks.onEvent({ type: 'progress', steps: parsedSkillSteps.steps, activeStep: 1 });
  }

  // Load OMC agents if available
  const omcAgents = await loadOmcAgents();
  if (omcAgents) {
    console.log(`[SDK] Loaded ${Object.keys(omcAgents).length} OMC agents`);
  }

  // Load registered plugin agents for the active plugin (from dmap-web/agents/{pluginId}/)
  const pluginAgents = pluginId ? loadRegisteredAgents(pluginId) : {};
  const pluginAgentCount = Object.keys(pluginAgents).length;
  if (pluginAgentCount > 0) {
    console.log(`[SDK] Loaded ${pluginAgentCount} registered agents for plugin "${pluginId}"`);
  }

  // Merge all agents: OMC (permanent) + active plugin agents
  const allAgents = { ...(omcAgents || {}), ...pluginAgents };
  const allAgentCount = Object.keys(allAgents).length;

  // Build plugin agent description for system prompt
  let pluginAgentGuide = '';
  if (pluginAgentCount > 0) {
    const pluginList = (Object.entries(pluginAgents) as [string, OmcAgentDef][])
      .map(([fqn, def]) => `  - "${fqn}" (${def.model || 'sonnet'}): ${def.description}`)
      .join('\n');
    pluginAgentGuide = `\nPLUGIN AGENTS: The following plugin-specific agents are also available via the Task tool:\n${pluginList}\nUse the full FQN as subagent_type (e.g., Task(subagent_type="${Object.keys(pluginAgents)[0] || 'scope:agent:agent'}", model="sonnet", prompt="...")).`;
  }

  const options: Record<string, unknown> = {
    model: 'claude-sonnet-4-5-20250929',
    permissionMode: 'bypassPermissions',
    cwd: dmapProjectDir,
    maxTurns: 15,
    // Prevent the model from delegating to agents/skills instead of working directly
    disallowedTools: ['EnterPlanMode', 'ExitPlanMode', 'TodoWrite'],
    ...(allAgentCount > 0 ? { agents: allAgents } : {}),
    // Place SKILL.md in system prompt so it's treated as instructions, not user input
    ...(skillContent ? {
      appendSystemPrompt: `${lang && lang !== 'ko' ? `### LANGUAGE OVERRIDE (HIGHEST PRIORITY) ###
You MUST respond ONLY in English. Every single message, explanation, question, and status update you produce MUST be written in English.
The skill instructions below are written in Korean — read and understand them, but ALL your output MUST be in English. Do NOT output any Korean text.
### END LANGUAGE OVERRIDE ###\n\n` : ''}IMPORTANT: You are a skill executor. Execute the skill instructions below using available tools (Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Task, etc.). Do NOT invoke other skills. Do NOT enter plan mode. Do NOT use TodoWrite.
AGENT DELEGATION: You MAY use the Task tool for parallel or complex work. Available OMC agents are injected with "omc-" prefix. Use agent names like "omc-architect", "omc-executor", "omc-explore", "omc-planner", "omc-build-fixer", etc. You can also use built-in agents: "general-purpose", "Explore", "Plan", "Bash". Set the model parameter to "haiku", "sonnet", or "opus" for tier routing.${pluginAgentGuide}
${ASK_USER_INSTRUCTION}
${SKILL_CHAIN_FILE_CONVENTION}${previousSkillName ? `\n\nPREVIOUS SKILL RESULT:\nThe previous skill "${previousSkillName}" may have saved results at: output/${previousSkillName}-result.md\nRead this file FIRST using the Read tool before starting your workflow.` : ''}

=== SKILL INSTRUCTIONS ===
${skillContent}${omcAgents ? `\n\n=== AGENT ORCHESTRATION PATTERNS ===\n${getSkillPatterns()}` : ''}`,
    } : {}),
  };

  if (resumeSessionId) {
    options.resume = resumeSessionId;
  }

  // Payload size diagnostics (Windows 32KB CLI limit)
  const agentsSize = options.agents ? JSON.stringify(options.agents).length : 0;
  const promptSize = typeof options.appendSystemPrompt === 'string' ? (options.appendSystemPrompt as string).length : 0;
  console.log(`[SDK] Payload: agents=${agentsSize}B, systemPrompt=${promptSize}B, total=${agentsSize + promptSize}B`);

  try {
    await initLog(dmapProjectDir, skillName);
    await log('options', { model: options.model, maxTurns: options.maxTurns, resumeSessionId, disallowedTools: options.disallowedTools, hasAppendSystemPrompt: !!options.appendSystemPrompt, omcAgentCount: omcAgents ? Object.keys(omcAgents).length : 0, pluginAgentCount, totalAgentCount: allAgentCount, payloadBytes: agentsSize + promptSize });

    const isEnglish = lang && lang !== 'ko';

    // Build file attachment suffix
    let fileAttachment = '';
    if (filePaths && filePaths.length > 0) {
      const fileList = filePaths.map((f) => `- ${f}`).join('\n');
      fileAttachment = isEnglish
        ? `\n\nAttached files:\n${fileList}\n\nRead the above files using the Read tool and refer to their contents.`
        : `\n\n첨부 파일:\n${fileList}\n\n위 파일들을 Read 도구로 읽어서 참고하세요.`;
    }

    let currentPrompt: string;
    if (resumeSessionId && input) {
      // Resume with user's answer
      currentPrompt = isEnglish ? `${input}\n\nRespond in English.` : input;
      currentPrompt += fileAttachment;
      console.log(`[SDK] Resuming session with user input for "${skillName}"`);
    } else if (resumeSessionId) {
      // Resume without explicit user input - provide continuation instruction
      // IMPORTANT: Generic "execute skill" prompt causes model to think work is done.
      // Must use explicit continuation instruction. (Architect verified across 3 log files)
      currentPrompt = isEnglish
        ? 'The previous session was interrupted. Continue executing the skill from where you left off. Do not repeat completed work. Respond in English.'
        : '이전 세션이 중단되었습니다. 중단된 지점부터 스킬 실행을 이어서 계속하세요. 이미 완료된 작업은 반복하지 마세요.';
      currentPrompt += fileAttachment;
      console.log(`[SDK] Resuming session without user input for "${skillName}" - using continuation prompt`);
    } else {
      // Fresh start
      currentPrompt = input
        ? (isEnglish
          ? `User input: ${input}\n\nExecute the skill instructions in the system prompt, referring to the input above. Respond in English.`
          : `사용자 입력: ${input}\n\n위 입력을 참고하여 시스템 프롬프트의 스킬 지시사항을 실행하세요.`)
        : (isEnglish
          ? `Execute the skill instructions in the system prompt. Respond in English.`
          : `시스템 프롬프트의 스킬 지시사항을 실행하세요.`);
      currentPrompt += fileAttachment;
      console.log(`[SDK] Prompt: ${currentPrompt}`);
    }

    let sdkSessionId = resumeSessionId;

    let currentActiveStep = 1;
    const trackingCallbacks: StreamCallbacks = parsedSkillSteps
      ? {
          onEvent: (event) => {
            callbacks.onEvent(event);
            if (event.type === 'text' && 'text' in event) {
              const detected = detectStepFromText((event as any).text, parsedSkillSteps.isPhaseMode);
              if (detected && detected > currentActiveStep && detected <= parsedSkillSteps.steps.length) {
                currentActiveStep = detected;
                callbacks.onEvent({ type: 'progress', activeStep: currentActiveStep });
              }
            }
          },
          onSessionId: callbacks.onSessionId,
        }
      : callbacks;

    // Loop to handle AskUserQuestion interactions
    while (true) {
      const opts: Record<string, unknown> = { ...options };
      if (sdkSessionId) opts.resume = sdkSessionId;

      const result = await runQuery(currentPrompt, opts, trackingCallbacks, abortController);
      sdkSessionId = result.sdkSessionId || sdkSessionId;

      // Update SDK session ID for future resume
      if (sdkSessionId) {
        callbacks.onSessionId?.(sdkSessionId);
      }

      // Send structured questions if detected
      if (result.pendingQuestions && result.pendingQuestions.questions.length > 0) {
        callbacks.onEvent({
          type: 'questions',
          title: result.pendingQuestions.title,
          questions: result.pendingQuestions.questions,
        });
      }


      // No askUserQuestion and no pendingQuestions → skill fully complete
      const fullyComplete = !result.pendingQuestions || result.pendingQuestions.questions.length === 0;
      console.log(`[SDK] Skill execution completed (fullyComplete=${fullyComplete})`);

      // Mark all progress steps as complete when skill finishes
      if (parsedSkillSteps && fullyComplete) {
        callbacks.onEvent({ type: 'progress', activeStep: parsedSkillSteps.steps.length + 1 });
      }

      return { fullyComplete };
    }
  } catch (error: any) {
    if (abortController?.signal.aborted) {
      console.log(`[SDK] Skill execution aborted for "${skillName}"`);
      return { fullyComplete: true };
    }
    console.error(`[SDK] Error:`, error);
    callbacks.onEvent({
      type: 'error',
      message: error.message || 'Claude SDK execution failed',
    });
    return { fullyComplete: true };
  }
}

export async function executePrompt(
  input: string,
  dmapProjectDir: string,
  lang: string | undefined,
  callbacks: StreamCallbacks,
  resumeSessionId?: string,
  pluginId?: string,
  filePaths?: string[],
  abortController?: AbortController,
): Promise<ExecuteSkillResult> {
  // Load OMC agents if available
  const omcAgents = await loadOmcAgents();
  if (omcAgents) {
    console.log(`[SDK] Loaded ${Object.keys(omcAgents).length} OMC agents for prompt mode`);
  }

  // Load registered plugin agents
  const pluginAgents = pluginId ? loadRegisteredAgents(pluginId) : {};
  const pluginAgentCount = Object.keys(pluginAgents).length;

  const allAgents = { ...(omcAgents || {}), ...pluginAgents };
  const allAgentCount = Object.keys(allAgents).length;

  let pluginAgentGuide = '';
  if (pluginAgentCount > 0) {
    const pluginList = (Object.entries(pluginAgents) as [string, OmcAgentDef][])
      .map(([fqn, def]) => `  - "${fqn}" (${def.model || 'sonnet'}): ${def.description}`)
      .join('\n');
    pluginAgentGuide = `\nPLUGIN AGENTS:\n${pluginList}\nUse the full FQN as subagent_type.`;
  }

  const isEnglish = lang && lang !== 'ko';

  const options: Record<string, unknown> = {
    model: 'claude-sonnet-4-5-20250929',
    permissionMode: 'bypassPermissions',
    cwd: dmapProjectDir,
    maxTurns: 15,
    disallowedTools: ['EnterPlanMode', 'ExitPlanMode', 'TodoWrite'],
    ...(allAgentCount > 0 ? { agents: allAgents } : {}),
    appendSystemPrompt: `${isEnglish ? `You MUST respond ONLY in English.\n\n` : ''}You are a helpful assistant working in the project directory. Execute the user's request using available tools (Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Task, etc.). Do NOT invoke other skills. Do NOT enter plan mode. Do NOT use TodoWrite.
AGENT DELEGATION: You MAY use the Task tool for parallel or complex work. Available OMC agents are injected with "omc-" prefix.${pluginAgentGuide}
${ASK_USER_INSTRUCTION}`,
  };

  if (resumeSessionId) {
    options.resume = resumeSessionId;
  }

  try {
    await initLog(dmapProjectDir, '__prompt__');

    let fileAttachment = '';
    if (filePaths && filePaths.length > 0) {
      const fileList = filePaths.map((f) => `- ${f}`).join('\n');
      fileAttachment = isEnglish
        ? `\n\nAttached files:\n${fileList}\n\nRead the above files using the Read tool and refer to their contents.`
        : `\n\n첨부 파일:\n${fileList}\n\n위 파일들을 Read 도구로 읽어서 참고하세요.`;
    }

    let currentPrompt: string;
    if (resumeSessionId && input) {
      currentPrompt = isEnglish ? `${input}\n\nRespond in English.` : input;
    } else if (resumeSessionId) {
      currentPrompt = isEnglish
        ? 'Continue from where you left off. Respond in English.'
        : '중단된 지점부터 이어서 계속하세요.';
    } else {
      currentPrompt = isEnglish ? `${input}\n\nRespond in English.` : input;
    }
    currentPrompt += fileAttachment;

    console.log(`[SDK] Prompt mode: ${currentPrompt.slice(0, 100)}...`);

    const result = await runQuery(currentPrompt, options, callbacks, abortController);

    if (result.sdkSessionId) {
      callbacks.onSessionId?.(result.sdkSessionId);
    }

    if (result.pendingQuestions && result.pendingQuestions.questions.length > 0) {
      callbacks.onEvent({
        type: 'questions',
        title: result.pendingQuestions.title,
        questions: result.pendingQuestions.questions,
      });
    }

    const fullyComplete = !result.pendingQuestions || result.pendingQuestions.questions.length === 0;
    return { fullyComplete };
  } catch (error: any) {
    if (abortController?.signal.aborted) {
      console.log(`[SDK] Prompt execution aborted`);
      return { fullyComplete: true };
    }
    console.error(`[SDK] Prompt error:`, error);
    callbacks.onEvent({ type: 'error', message: error.message || 'Prompt execution failed' });
    return { fullyComplete: true };
  }
}
