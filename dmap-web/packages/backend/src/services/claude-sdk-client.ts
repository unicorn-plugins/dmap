/**
 * Claude SDK 클라이언트 - DMAP 스킬 실행 엔진
 *
 * @anthropic-ai/claude-code SDK의 query() 함수를 래핑하여 스킬 실행, SSE 스트리밍,
 * ASK_USER 프로토콜, 스킬 체인(CHAIN>>>), 자동 재개(auto-continue) 등 핵심 기능을 제공.
 *
 * 주요 흐름:
 * 1. executeSkill() → SKILL.md 로드 + 에이전트 주입 + SDK query() 호출
 * 2. runQuery() → SDK 메시지 스트림 소비 + SSE 이벤트 변환
 * 3. 사용자 질문 감지 시 pendingQuestions 반환 → 프론트엔드 QuestionFormDialog 표시
 * 4. 턴 소진 시 자동 재개(최대 5회)
 *
 * @module claude-sdk-client
 */
import { readFile, mkdir, appendFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SSEEvent, QuestionItem } from '@dmap-web/shared';
import { loadOmcAgents, getSkillPatterns, getSkillPatternsFallback, type OmcAgentDef } from './omc-integration.js';
import { loadRegisteredPlugin } from './agent-registry.js';
import { getDefaultSdkModel } from './model-versions.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('SDK');

/** 시스템 설치된 Claude Code 네이티브 바이너리 경로 해석 */
function resolveClaudeBinary(): string {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(home, '.local', 'bin', `claude${ext}`);
}

type LogFn = (label: string, data?: unknown) => Promise<void>;

async function createFileLogger(dmapProjectDir: string, skillName: string): Promise<LogFn> {
  const logsDir = path.join(dmapProjectDir, '.dmap', 'logs');
  await mkdir(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.join(logsDir, `${ts}_${skillName}.log`);
  await appendFile(filePath, `=== ${skillName} started at ${new Date().toISOString()} ===\n`);

  return async (label: string, data?: unknown): Promise<void> => {
    const line = data !== undefined
      ? `[${new Date().toISOString()}] ${label}: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`
      : `[${new Date().toISOString()}] ${label}\n`;
    await appendFile(filePath, line).catch(() => {});
  };
}

/** SSE 스트리밍 콜백 인터페이스 - 백엔드→프론트엔드 실시간 이벤트 전달 */
export interface StreamCallbacks {
  onEvent: (event: SSEEvent) => void;
  onSessionId?: (sessionId: string) => void;
}

/**
 * SDK query() 실행 결과
 * @property hasContent - 텍스트 콘텐츠 발생 여부
 * @property sdkSessionId - SDK 세션 ID (재개 시 사용)
 * @property numTurns - 소비된 턴 수 (auto-continue 판단 기준)
 * @property pendingQuestions - 사용자 질문이 감지된 경우 질문 목록
 */
interface RunQueryResult {
  hasContent: boolean;
  sdkSessionId?: string;
  numTurns?: number;
  pendingQuestions?: {
    title: string;
    questions: QuestionItem[];
  };
}

// SDK message types (not exported by @anthropic-ai/claude-code)
/** SDK 메시지 콘텐츠 블록 (text, tool_use 등) - @anthropic-ai/claude-code에서 미 export */
interface SdkContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
}

/** SDK 메시지 타입 (system, assistant, result) - @anthropic-ai/claude-code에서 미 export */
interface SdkMessage {
  type: string;
  session_id?: string;
  message?: { content?: SdkContentBlock[] };
  content?: SdkContentBlock[];
  total_cost_usd?: number;
  usage?: Record<string, number>;
  num_turns?: number;
  duration_ms?: number;
}

/** ASK_USER HTML 코멘트 블록 매칭 정규식 - 모델 출력에서 구조화된 질문 추출용 */
const ASK_USER_REGEX_G = /<!--ASK_USER-->\s*([\s\S]*?)\s*<!--\/ASK_USER-->/g;

/** RELEVANCE_MISMATCH HTML 코멘트 블록 매칭 정규식 - 스킬 관련성 불일치 감지용 */
const RELEVANCE_MISMATCH_REGEX = /<!--RELEVANCE_MISMATCH-->\s*([\s\S]*?)\s*<!--\/RELEVANCE_MISMATCH-->/;

/**
 * SKILL.md에서 Phase/Step 헤딩을 파싱하여 진행률 추적 데이터 생성
 *
 * Phase 패턴: "### Phase 1: 요구사항 분석" → 상위 레벨 그룹핑 (develop-plugin 등)
 * Step 패턴: "### Step 1: 문서 준비" → 단순 단계별 진행 (team-planner, publish 등)
 *
 * @param skillContent - SKILL.md 파일 내용
 * @returns Phase/Step 목록 + Phase 모드 여부, 2개 미만이면 null
 */
function parseSkillSteps(skillContent: string): { steps: Array<{ step: number; label: string }>; isPhaseMode: boolean } | null {
  // Try Phase pattern first (higher-level grouping like develop-plugin)
  // Support both ### and #### headings
  const phasePattern = /^#{3,4}\s+Phase\s+(\d+)[:.]\s*(.+)$/gm;
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
  const stepPattern = /^#{3,4}\s+Step\s+(\d+)[:.]\s*(.+)$/gm;
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

/**
 * 모델 출력 텍스트에서 현재 Phase/Step 번호를 감지
 * 텍스트에 여러 번호가 있으면 가장 큰 값을 반환 (진행 방향 = 증가)
 *
 * @param text - 모델의 텍스트 출력
 * @param isPhaseMode - Phase 모드이면 "Phase N", 아니면 "Step N" 검색
 * @returns 감지된 단계 번호, 없으면 null
 */
function detectStepFromText(text: string, isPhaseMode: boolean): number | null {
  const keyword = isPhaseMode ? 'Phase' : 'Step';
  const regex = new RegExp(`${keyword}\\s+(\\d+)`, 'gi');
  const matches = [...text.matchAll(regex)];
  if (matches.length > 0) {
    return Math.max(...matches.map(m => parseInt(m[1], 10)));
  }
  return null;
}

/**
 * 모델 출력에서 <!--RELEVANCE_MISMATCH-->...<!--/RELEVANCE_MISMATCH--> 블록 추출
 * ASK_USER/CHAIN과 독립적으로 먼저 실행하여, 공존 시에도 정상 처리
 */
function extractRelevanceMismatch(text: string): {
  cleanText: string;
  suggestedSkill: string;
  reason: string;
  isPromptMode: boolean;
} | null {
  const match = text.match(RELEVANCE_MISMATCH_REGEX);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    const cleanText = text.replace(RELEVANCE_MISMATCH_REGEX, '').trim();
    return {
      cleanText,
      suggestedSkill: String(parsed.suggestedSkill || '__prompt__'),
      reason: String(parsed.reason || ''),
      isPromptMode: !!parsed.isPromptMode,
    };
  } catch {
    return null;
  }
}

/**
 * 모델 출력에서 <!--ASK_USER-->...<!--/ASK_USER--> 블록을 추출하여 구조화된 질문으로 변환
 *
 * 프로토콜: 모델이 HTML 코멘트 형식으로 JSON 질문 블록을 출력 →
 *          백엔드가 파싱하여 'questions' SSE 이벤트로 변환 →
 *          프론트엔드 QuestionFormDialog가 렌더링
 *
 * @param text - 모델의 텍스트 출력 (ASK_USER 블록 포함 가능)
 * @returns cleanText(ASK_USER 제거된 텍스트) + 파싱된 질문 목록, 없으면 null
 */
function extractAskUserBlocks(text: string): { cleanText: string; title: string; questions: QuestionItem[] } | null {
  const matches = [...text.matchAll(ASK_USER_REGEX_G)];
  if (matches.length === 0) return null;

  const allQuestions: QuestionItem[] = [];
  let title = '질문';

  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed.title) title = parsed.title;
      if (Array.isArray(parsed.questions)) allQuestions.push(...parsed.questions);
    } catch (e) {
      log.error('Failed to parse ASK_USER JSON:', e);
    }
  }

  if (allQuestions.length === 0) return null;

  const cleanText = text.replace(ASK_USER_REGEX_G, '').trim();
  return { cleanText, title, questions: allQuestions };
}

/**
 * 모델 출력에서 스킬 체인 명령(CHAIN>>>/pluginId:skillName)을 감지
 *
 * 스킬 체인: 현재 스킬 완료 후 다른 스킬로 자동 전환하는 메커니즘
 * 예) develop-plugin 완료 → CHAIN>>>/dmap:publish → publish 스킬 자동 실행
 *
 * @param text - 모델의 텍스트 출력
 * @returns 감지된 스킬 이름과 입력값, 없으면 null
 */
function detectSkillChainCommand(text: string): { skillName: string; input?: string } | null {
  // Detect explicit chain marker: CHAIN>>>/pluginId:skill-name at line start
  const slashPattern = /^CHAIN>>>\/([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)(?:\s+(.+))?/m;
  const match = text.match(slashPattern);
  if (match) {
    return { skillName: match[2], input: match[3]?.trim() };
  }
  return null;
}

/**
 * OMC 에이전트와 플러그인 에이전트를 모두 로드하여 병합
 *
 * 로딩 순서: OMC 에이전트(~/.claude/plugins/cache/omc/) → 플러그인 에이전트(agents/)
 * 플러그인 에이전트가 OMC와 동일 키를 가지면 플러그인 에이전트가 우선(덮어쓰기)
 *
 * @param pluginId - 플러그인 ID (없으면 OMC 에이전트만 로드)
 * @param skillName - 스킬 이름 (선택적 에이전트 필터링에 사용)
 * @returns 에이전트 맵 + 각 카운트 + 플러그인 에이전트 가이드 텍스트
 */
async function loadAllAgents(pluginId?: string, skillName?: string) {
  const omcAgents = await loadOmcAgents();
  const pluginAgents = pluginId ? loadRegisteredPlugin(pluginId, skillName) : {};
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

  return { omcAgents, pluginAgents, pluginAgentCount, allAgents, allAgentCount, pluginAgentGuide };
}

/**
 * 첨부 파일 경로 목록을 프롬프트에 포함할 텍스트로 변환
 * Read 도구로 읽도록 모델에게 안내하는 지시문 포함
 */
function buildFileAttachment(filePaths: string[] | undefined, isEnglish: boolean): string {
  if (!filePaths || filePaths.length === 0) return '';
  const fileList = filePaths.map((f) => `- ${f}`).join('\n');
  return isEnglish
    ? `\n\nAttached files:\n${fileList}\n\nRead the above files using the Read tool and refer to their contents.`
    : `\n\n첨부 파일:\n${fileList}\n\n위 파일들을 Read 도구로 읽어서 참고하세요.`;
}

/** 스킬 관련성 판단 지시문 - 사용자 입력이 현재 스킬과 무관할 때 추천 블록 출력 */
const SKILL_RELEVANCE_INSTRUCTION = `
SKILL RELEVANCE CHECK:
Before executing, briefly assess if the user's current input is relevant to this skill.
If the input is clearly unrelated to this skill's purpose, output the following block ONCE at the very beginning of your response, then continue with normal execution:

<!--RELEVANCE_MISMATCH-->
{"suggestedSkill":"<skill-name>","reason":"<brief explanation in user's language>","isPromptMode":<true|false>}
<!--/RELEVANCE_MISMATCH-->

Rules:
- Output this block ONLY when the input is clearly unrelated. When uncertain, do NOT output it.
- After outputting, proceed with the current skill's instructions normally. Do NOT stop execution.
- suggestedSkill: pick from AVAILABLE SKILLS below. If none match, use "__prompt__".
- isPromptMode: true only when suggestedSkill is "__prompt__".
- reason: under 50 chars, same language as user input.
`;

/** 모델에게 주입되는 ASK_USER 프로토콜 지시문 - AskUserQuestion 도구 대신 HTML 코멘트 형식 사용 강제 */
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

/** 권한 자동 처리 안내 - 모델이 CLI 승인 다이얼로그를 언급하지 않도록 지시 */
const PERMISSION_AUTO_INSTRUCTION = `
PERMISSION HANDLING:
All tool permissions are managed automatically. All tools including Bash commands are pre-approved.
You can freely execute any Bash command (gh, git, npm, curl, etc.) without permission issues.
Do NOT mention CLI terminal approval dialogs or sandbox restrictions. Simply execute commands directly.
If a tool call fails, retry or use an alternative approach.
IMPORTANT: For file/directory existence checks, ALWAYS use the Glob tool instead of Bash "test -d" or "ls". Glob works reliably in all environments.`;

// ── canUseTool 도구 안전 분류 ──

/** 항상 자동 승인하는 도구 */
const AUTO_ALLOW_TOOLS = new Set([
  'Read', 'Write', 'Edit', 'NotebookEdit',
  'Glob', 'Grep', 'Task', 'WebFetch', 'WebSearch',
  'EnterWorktree', 'AskUserQuestion',
]);

/** 안전한 Bash 명령 프리픽스 */
const SAFE_BASH_PREFIXES = [
  'gh ', 'git ', 'ls', 'cat ', 'head ', 'tail ', 'mkdir ',
  'npm ', 'npx ', 'node ', 'curl ', 'echo ', 'pwd',
  'cp ', 'mv ', 'find ', 'grep ', 'wc ', 'sort ',
  'touch ', 'chmod ', 'which ', 'cd ', 'tar ', 'unzip ',
];

/** 위험한 Bash 패턴 */
const DANGEROUS_BASH_PATTERNS = [
  /rm\s+-[^\s]*r[^\s]*f/,  // rm -rf
  /rm\s+-[^\s]*f[^\s]*r/,  // rm -fr
  /shutdown|reboot|halt|poweroff/,
  /DROP\s+(TABLE|DATABASE)/i,
  /mkfs\./,
  /dd\s+if=/,
];

function classifyBashCommand(command: string): 'allow' | 'danger' | 'warning' {
  for (const p of DANGEROUS_BASH_PATTERNS) {
    if (p.test(command)) return 'danger';
  }
  const trimmed = command.trim();
  for (const prefix of SAFE_BASH_PREFIXES) {
    if (trimmed.startsWith(prefix)) return 'allow';
  }
  // 파이프 명령: 각 세그먼트 검사
  const segments = trimmed.split(/\s*[|&;]\s*/);
  if (segments.every(seg => SAFE_BASH_PREFIXES.some(p => seg.trim().startsWith(p)))) {
    return 'allow';
  }
  return 'warning'; // 미분류 → 사용자 확인
}

// ── 대기 중인 권한 요청 관리 ──

const pendingPermissions = new Map<string, {
  resolve: (result: { behavior: 'allow' } | { behavior: 'deny'; message: string }) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}>();

const PERMISSION_TIMEOUT_MS = 5 * 60 * 1000; // 5분

export function resolvePermissionRequest(
  requestId: string,
  decision: 'allow' | 'deny',
  message?: string,
): boolean {
  const pending = pendingPermissions.get(requestId);
  if (!pending) return false;
  clearTimeout(pending.timeoutId);
  pendingPermissions.delete(requestId);
  if (decision === 'allow') {
    pending.resolve({ behavior: 'allow' });
  } else {
    pending.resolve({ behavior: 'deny', message: message || 'User denied' });
  }
  return true;
}

/** canUseTool 콜백 팩토리 - SSE 이벤트로 권한 요청을 프론트엔드에 전달 */
function createCanUseTool(callbacks: StreamCallbacks) {
  return async (
    toolName: string,
    input: Record<string, unknown>,
    options: { signal: AbortSignal; [key: string]: unknown },
  ) => {
    // 1. 자동 승인 도구
    if (AUTO_ALLOW_TOOLS.has(toolName)) {
      return { behavior: 'allow' as const };
    }
    // MCP 도구 자동 승인
    if (toolName.startsWith('mcp__')) {
      return { behavior: 'allow' as const };
    }
    // 2. Bash 명령 분류
    if (toolName === 'Bash') {
      const command = String(input.command || '').trim();
      const classification = classifyBashCommand(command);
      if (classification === 'allow') {
        return { behavior: 'allow' as const };
      }
      // 사용자 승인 필요 → SSE 이벤트 전송 + 응답 대기
      const requestId = crypto.randomUUID();
      callbacks.onEvent({
        type: 'permission_request',
        requestId,
        toolName,
        description: command.slice(0, 500),
        riskLevel: classification, // 'warning' | 'danger'
      });

      return new Promise<{ behavior: 'allow' } | { behavior: 'deny'; message: string }>((resolve) => {
        const timeoutId = setTimeout(() => {
          pendingPermissions.delete(requestId);
          resolve({ behavior: 'deny', message: 'Permission timed out (5min)' });
        }, PERMISSION_TIMEOUT_MS);
        pendingPermissions.set(requestId, { resolve, timeoutId });
        options.signal.addEventListener('abort', () => {
          const p = pendingPermissions.get(requestId);
          if (p) {
            clearTimeout(p.timeoutId);
            pendingPermissions.delete(requestId);
            resolve({ behavior: 'deny', message: 'Aborted' });
          }
        }, { once: true });
      });
    }
    // 3. 기타 도구 → 자동 승인
    return { behavior: 'allow' as const };
  };
}

/** 스킬 체인 시 결과물 파일 저장 규약 - 다음 스킬이 이전 스킬 결과를 참조할 수 있도록 output/ 디렉토리에 저장 */
const SKILL_CHAIN_FILE_CONVENTION = `
SKILL CHAIN FILE CONVENTION:
When your skill work is complete and you are about to chain to another skill:
1. BEFORE outputting the chain command, save your key results/output to: ./output/{current-skill-name}-result.md (relative to the project root)
2. Use the Write tool to create this file in the project directory
3. The file should contain all essential outputs that the next skill needs to continue the workflow
4. Then output the chain command using the CHAIN>>> prefix: CHAIN>>>/pluginId:skill-name [optional input]
   - IMPORTANT: You MUST use the exact prefix "CHAIN>>>" before the slash command. Without this prefix, the chain will NOT be detected.
   - Example: CHAIN>>>/dmap:publish my-plugin
   - Do NOT output /pluginId:skill-name without the CHAIN>>> prefix when you intend to chain to another skill.

When a previous skill's result file path is provided below, read that file FIRST to get context from the previous skill before starting your own workflow. If the file does not exist, proceed with your workflow without previous context.`;

/**
 * Claude SDK query() 실행 및 메시지 스트림 처리 (내부 핵심 함수)
 *
 * SDK의 async iterator를 소비하며 각 메시지 타입별로 SSE 이벤트를 생성:
 * - system → sdkSessionId 캡처
 * - assistant/text → CHAIN>>> 감지, ASK_USER 추출, 일반 텍스트 전송
 * - assistant/tool_use → AskUserQuestion 변환, Task 에이전트 이벤트, 도구 이벤트 전송
 * - result → 토큰 사용량/비용 전송, 세션 ID 업데이트
 *
 * @param prompt - 모델에 전달할 프롬프트
 * @param options - SDK query() 옵션 (model, agents, appendSystemPrompt 등)
 * @param callbacks - SSE 이벤트 콜백
 * @param externalAbortController - 외부 중단 컨트롤러
 * @param fileLog - 파일 로거 (디버깅용)
 */
async function runQuery(
  prompt: string,
  options: Record<string, unknown>,
  callbacks: StreamCallbacks,
  externalAbortController?: AbortController,
  fileLog?: LogFn,
): Promise<RunQueryResult> {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  const abortController = externalAbortController || new AbortController();
  options.abortController = abortController;

  let hasContent = false;
  let sdkSessionId: string | undefined;
  let numTurns = 0;
  let pendingQuestions: RunQueryResult['pendingQuestions'] = undefined;
  for await (const message of query({
    prompt,
    options: options as any,
  })) {
    if (abortController.signal.aborted) break;

    log.info(`message.type=${message.type}`, JSON.stringify(message).slice(0, 500));
    await fileLog?.(`message.type=${message.type}`, message);

    // Capture session ID from system init
    if (message.type === 'system') {
      const sysMsg = message as SdkMessage;
      if (sysMsg.session_id) {
        sdkSessionId = sysMsg.session_id;
      }
    }

    // Assistant messages with content blocks
    if (message.type === 'assistant') {
      const assistantMsg = message as SdkMessage;
      const content = assistantMsg.message?.content ?? assistantMsg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            // 1. RELEVANCE_MISMATCH 독립 추출 (다른 패턴과 공존 가능)
            let processText = block.text;
            const relevance = extractRelevanceMismatch(processText);
            if (relevance) {
              callbacks.onEvent({
                type: 'skill_suggestion',
                suggestedSkill: relevance.suggestedSkill,
                reason: relevance.reason,
                isPromptMode: relevance.isPromptMode,
              });
              log.info(`Skill relevance mismatch: suggested ${relevance.suggestedSkill}`);
              await fileLog?.('relevance_mismatch', relevance);
              processText = relevance.cleanText;
              if (!processText) break;
            }

            // 2. CHAIN>>> 감지 (기존)
            const chainCommand = detectSkillChainCommand(processText);
            if (chainCommand) {
              log.info(`Detected skill chain: → ${chainCommand.skillName}`);
              await fileLog?.('skill_chain_detected', chainCommand);
              callbacks.onEvent({
                type: 'skill_changed',
                newSkillName: chainCommand.skillName,
                chainInput: chainCommand.input || '',
              });
              // Abort current execution to prevent complete event conflict
              abortController.abort();
              return { hasContent, sdkSessionId, pendingQuestions };
            }

            // 3. ASK_USER 감지 (기존)
            const extracted = extractAskUserBlocks(processText);
            if (extracted) {
              if (extracted.cleanText) {
                hasContent = true;
                callbacks.onEvent({ type: 'text', text: extracted.cleanText });
              }
              pendingQuestions = { title: extracted.title, questions: extracted.questions };
              log.info(`Parsed ${extracted.questions.length} structured questions`);
              await fileLog?.('parsed_questions', pendingQuestions);
            } else {
              // 4. 일반 텍스트 (기존)
              hasContent = true;
              callbacks.onEvent({ type: 'text', text: processText });
            }
          } else if (block.type === 'tool_use') {
            // AskUserQuestion 도구 호출 감지 → CLI 데드락 방지를 위해 즉시 abort
            // SDK의 CLI 모드는 tool_result를 기다리므로, abort하고 pendingQuestions로 변환하여
            // 프론트엔드 QuestionFormDialog 경로로 우회 처리
            if (block.name === 'AskUserQuestion') {
              // AskUserQuestion detected - abort is REQUIRED to prevent CLI deadlock
              // (CLI waits for tool_result indefinitely without abort)
              log.warn('AskUserQuestion tool detected. Aborting and converting to pendingQuestions.');
              await fileLog?.('askUserQuestion_converted', block.input);

              // Convert AskUserQuestion data to pendingQuestions format
              const askInput = block.input as Record<string, unknown> | undefined;
              const askQuestions = (askInput?.questions ?? []) as Array<Record<string, unknown>>;
              if (askQuestions.length > 0) {
                pendingQuestions = {
                  title: String(askQuestions[0]?.question || '질문'),
                  questions: askQuestions.map((q) => ({
                    question: String(q.question || ''),
                    description: String(q.description || ''),
                    type: q.options ? 'radio' as const : 'text' as const,
                    options: (Array.isArray(q.options) ? q.options : []).map((o: unknown) =>
                      typeof o === 'string' ? o : String((o as Record<string, unknown>).label || '')
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
            // Task 도구 호출 = 에이전트 위임 → 프론트엔드 ActivityPanel에 에이전트 정보 표시
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
                  id: block.id || '',
                  subagentType: String(taskInput.subagent_type || 'unknown'),
                  model,
                  description: String(taskInput.description || ''),
                });
              }
            }
            // 도구별 간략 설명 추출 - ActivityPanel의 ToolSection에 표시될 정보
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
            callbacks.onEvent({ type: 'tool', name: block.name || '', id: block.id || '', description: desc || undefined });
          }
        }
      }
    }

    // Result: process usage and session ID only (text already emitted in assistant message)
    if (message.type === 'result') {
      const resultMsg = message as SdkMessage;
      // Emit usage data
      if (resultMsg.total_cost_usd !== undefined || resultMsg.usage) {
        const usageData = (resultMsg.usage || {}) as Record<string, number>;
        numTurns = (resultMsg.num_turns as number) || 0;
        callbacks.onEvent({
          type: 'usage',
          inputTokens: usageData.input_tokens || 0,
          outputTokens: usageData.output_tokens || 0,
          cacheReadTokens: usageData.cache_read_input_tokens || 0,
          cacheCreationTokens: usageData.cache_creation_input_tokens || 0,
          totalCostUsd: (resultMsg.total_cost_usd as number) || 0,
          durationMs: (resultMsg.duration_ms as number) || 0,
          numTurns,
        });
      }
      if (resultMsg.session_id) {
        sdkSessionId = resultMsg.session_id;
        callbacks.onSessionId?.(resultMsg.session_id);
      }
    }
  }

  return { hasContent, sdkSessionId, numTurns, pendingQuestions };
}

export interface ExecuteSkillResult {
  fullyComplete: boolean;
}

/**
 * DMAP 스킬 실행 메인 함수
 *
 * 실행 흐름:
 * 1. SKILL.md 로드 → Phase/Step 파싱 → 진행률 추적 초기화
 * 2. OMC + 플러그인 에이전트 로드 → agents 옵션에 주입
 * 3. appendSystemPrompt에 스킬 지시문 + ASK_USER 프로토콜 + 체인 규약 설정
 * 4. runQuery() 루프: 턴 소진 시 자동 재개, 사용자 질문 감지 시 중단
 *
 * @param skillName - 실행할 스킬 이름 (skills/{name}/SKILL.md)
 * @param input - 사용자 입력 (선택)
 * @param dmapProjectDir - DMAP 프로젝트 루트 경로
 * @param lang - 언어 코드 ('ko' 또는 기타=영어)
 * @param callbacks - SSE 스트리밍 콜백
 * @param resumeSessionId - 재개할 SDK 세션 ID
 * @param pluginId - 플러그인 ID
 * @param filePaths - 첨부 파일 경로 목록
 * @param abortController - 중단 컨트롤러
 * @param previousSkillName - 체인 시 이전 스킬 이름 (결과 파일 참조용)
 * @returns fullyComplete - 스킬이 완전히 완료되었는지 여부 (false면 사용자 응답 대기)
 */
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
  availableSkills?: Array<{ name: string; description: string }>,
): Promise<ExecuteSkillResult> {
  // Always read SKILL.md (needed for appendSystemPrompt on every call, including resume)
  const skillPath = path.join(dmapProjectDir, 'skills', skillName, 'SKILL.md');
  let skillContent = '';
  try {
    skillContent = await readFile(skillPath, 'utf-8');
    log.info(`Loaded SKILL.md for "${skillName}" (${skillContent.length} chars)`);
  } catch {
    log.error(`SKILL.md not found at ${skillPath}`);
    callbacks.onEvent({ type: 'error', message: `Skill "${skillName}" not found` });
    return { fullyComplete: true };
  }

  // Parse steps from SKILL.md for progress tracking
  const parsedSkillSteps = parseSkillSteps(skillContent);
  if (parsedSkillSteps) {
    log.info(`Parsed ${parsedSkillSteps.steps.length} ${parsedSkillSteps.isPhaseMode ? 'phases' : 'steps'} from SKILL.md`);
    callbacks.onEvent({ type: 'progress', steps: parsedSkillSteps.steps, activeStep: 1 });
  }

  // Load all agents (OMC + plugin, filtered by skillName for selective loading)
  // ext-* 스킬은 Skill 도구로 외부 위임하므로 에이전트 주입 불필요 (Windows 32KB CLI 한계 회피)
  const isExtSkill = skillName.startsWith('ext-');
  const { omcAgents, pluginAgentCount, allAgents, allAgentCount, pluginAgentGuide: basePluginGuide } = isExtSkill
    ? { omcAgents: null, pluginAgentCount: 0, allAgents: {} as Record<string, OmcAgentDef>, allAgentCount: 0, pluginAgentGuide: '' }
    : await loadAllAgents(pluginId, skillName);
  if (!isExtSkill) {
    if (omcAgents) log.info(`Loaded ${Object.keys(omcAgents).length} OMC agents`);
    if (pluginAgentCount > 0) log.info(`Loaded ${pluginAgentCount} registered agents for plugin "${pluginId}"`);
  } else {
    log.info(`ext-* skill "${skillName}": skipping agent loading (Skill tool delegation)`);
  }

  // ext-* 스킬: 대상 플러그인 설치 여부를 백엔드에서 직접 확인하여 시스템 프롬프트에 주입
  // (acceptEdits 환경에서 모델이 Bash/Glob으로 확인 시 실패하는 문제 해결)
  let extPluginCheckResult = '';
  if (isExtSkill) {
    const targetPlugin = skillName.replace(/^ext-/, '');
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const pluginCachePath = path.join(home, '.claude', 'plugins', 'cache', targetPlugin);
    const pluginInstalled = existsSync(pluginCachePath);
    if (pluginInstalled) {
      // 설치된 버전 목록도 수집
      let versions: string[] = [];
      try {
        const entries = readdirSync(pluginCachePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subEntries = readdirSync(path.join(pluginCachePath, entry.name), { withFileTypes: true });
            versions = subEntries.filter(e => e.isDirectory()).map(e => e.name);
          }
        }
      } catch { /* ignore */ }
      extPluginCheckResult = `\nEXT-PLUGIN PRE-CHECK RESULT:\nThe target plugin "${targetPlugin}" is CONFIRMED INSTALLED at: ${pluginCachePath}\n${versions.length > 0 ? `Installed versions: ${versions.join(', ')}\n` : ''}SKIP the plugin installation check in Phase 0. Proceed directly to domain context collection and workflow execution.\nDo NOT tell the user to install the plugin. Do NOT show installation commands.`;
      log.info(`ext-* plugin "${targetPlugin}" confirmed installed at ${pluginCachePath} (versions: ${versions.join(', ') || 'unknown'})`);
    } else {
      extPluginCheckResult = `\nEXT-PLUGIN PRE-CHECK RESULT:\nThe target plugin "${targetPlugin}" is NOT installed. Cache path not found: ${pluginCachePath}\nFollow the SKILL.md installation instructions and inform the user.`;
      log.warn(`ext-* plugin "${targetPlugin}" NOT found at ${pluginCachePath}`);
    }
  }

  // Enrich plugin agent guide with usage example for skill context
  const pluginAgentGuide = pluginAgentCount > 0
    ? basePluginGuide.replace('Use the full FQN as subagent_type.', `Use the full FQN as subagent_type (e.g., Task(subagent_type="${Object.keys(allAgents)[0] || 'scope:agent:agent'}", model="sonnet", prompt="...")).`)
    : '';

  // Build available skill list for relevance check instruction
  const skillListText = availableSkills
    ? availableSkills
        .filter(s => s.name !== skillName && s.name !== '__prompt__')
        .map(s => `- ${s.name}: ${s.description}`)
        .concat(['- __prompt__: 자유 프롬프트 (Free prompt mode)'])
        .join('\n')
    : '- __prompt__: 자유 프롬프트 (Free prompt mode)';

  // SDK 호출 옵션 구성 - acceptEdits + allowedTools로 Bash 자동 승인
  // NOTE: canUseTool 콜백은 SDK 내부 ZodError 및 headless 환경 호환성 문제로 비활성화.
  //       대신 allowedTools: ['Bash']로 모든 Bash 명령을 자동 승인하여 데드락 방지.
  // TODO: SDK의 canUseTool 버그 수정 시 createCanUseTool(callbacks)로 복원하여
  //       위험한 명령 프론트엔드 UI 승인 기능 활성화
  // CLAUDECODE 환경변수 제거: Claude Code 세션 내부에서 서버 실행 시 중첩 세션 방지
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  const options: Record<string, unknown> = {
    model: getDefaultSdkModel(),
    permissionMode: 'acceptEdits',
    allowedTools: ['Bash'],
    cwd: dmapProjectDir,
    maxTurns: 50,
    env: cleanEnv,
    // 시스템 설치된 Claude Code CLI 사용 (Max 구독 OAuth 인증 공유)
    pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_PATH || resolveClaudeBinary(),
    // Prevent the model from delegating to agents/skills instead of working directly
    disallowedTools: ['EnterPlanMode', 'ExitPlanMode', 'TodoWrite'],
    ...(allAgentCount > 0 ? { agents: allAgents } : {}),
    // Place SKILL.md in system prompt via preset+append (claude-agent-sdk 방식)
    ...(skillContent ? {
      systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const, append: `${lang && lang !== 'ko' ? `### LANGUAGE OVERRIDE (HIGHEST PRIORITY) ###
You MUST respond ONLY in English. Every single message, explanation, question, and status update you produce MUST be written in English.
The skill instructions below are written in Korean — read and understand them, but ALL your output MUST be in English. Do NOT output any Korean text.
### END LANGUAGE OVERRIDE ###\n\n` : ''}IMPORTANT: You are a skill executor. Execute the skill instructions below using available tools (Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Task, etc.).${skillName.startsWith('ext-') ? ' You MAY use the Skill tool to invoke external plugin skills as specified in the skill instructions.' : ' Do NOT invoke other skills.'} Do NOT enter plan mode. Do NOT use TodoWrite.
AGENT DELEGATION: You MAY use the Task tool for parallel or complex work. Available OMC agents are injected with "omc-" prefix. Use agent names like "omc-architect", "omc-executor", "omc-explore", "omc-planner", "omc-build-fixer", etc. You can also use built-in agents: "general-purpose", "Explore", "Plan", "Bash". Set the model parameter to "haiku", "sonnet", or "opus" for tier routing.${pluginAgentGuide}
${SKILL_RELEVANCE_INSTRUCTION}
AVAILABLE SKILLS:
${skillListText}
${ASK_USER_INSTRUCTION}
${PERMISSION_AUTO_INSTRUCTION}${extPluginCheckResult}
${SKILL_CHAIN_FILE_CONVENTION}${previousSkillName ? `\n\nPREVIOUS SKILL RESULT:\nThe previous skill "${previousSkillName}" may have saved results at: output/${previousSkillName}-result.md\nRead this file FIRST using the Read tool before starting your workflow.` : ''}

=== SKILL INSTRUCTIONS ===
${skillContent}\n\n=== AGENT ORCHESTRATION PATTERNS ===\n${omcAgents ? getSkillPatterns() : getSkillPatternsFallback()}` },
    } : {}),
  };

  if (resumeSessionId) {
    options.resume = resumeSessionId;
  }

  // Payload size diagnostics (Windows 32KB CLI limit)
  const agentsSize = options.agents ? JSON.stringify(options.agents).length : 0;
  const sysPrompt = options.systemPrompt as { append?: string } | undefined;
  const promptSize = sysPrompt?.append ? sysPrompt.append.length : 0;
  log.info(`Payload: agents=${agentsSize}B, systemPrompt=${promptSize}B, total=${agentsSize + promptSize}B`);

  const fileLog = await createFileLogger(dmapProjectDir, skillName);

  try {
    await fileLog('options', { model: options.model, maxTurns: options.maxTurns, resumeSessionId, disallowedTools: options.disallowedTools, hasSystemPrompt: !!options.systemPrompt, omcAgentCount: omcAgents ? Object.keys(omcAgents).length : 0, pluginAgentCount, totalAgentCount: allAgentCount, payloadBytes: agentsSize + promptSize });

    const isEnglish = lang && lang !== 'ko';
    const fileAttachment = buildFileAttachment(filePaths, !!isEnglish);

    let currentPrompt: string;
    if (resumeSessionId && input) {
      // Resume with user's answer
      currentPrompt = isEnglish ? `${input}\n\nRespond in English.` : input;
      currentPrompt += fileAttachment;
      log.info(`Resuming session with user input for "${skillName}"`);
    } else if (resumeSessionId) {
      // Resume without explicit user input - provide continuation instruction
      // IMPORTANT: Generic "execute skill" prompt causes model to think work is done.
      // Must use explicit continuation instruction. (Architect verified across 3 log files)
      currentPrompt = isEnglish
        ? 'The previous session was interrupted. Continue executing the skill from where you left off. Do not repeat completed work. Respond in English.'
        : '이전 세션이 중단되었습니다. 중단된 지점부터 스킬 실행을 이어서 계속하세요. 이미 완료된 작업은 반복하지 마세요.';
      currentPrompt += fileAttachment;
      log.info(`Resuming session without user input for "${skillName}" - using continuation prompt`);
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
      log.info(`Prompt: ${currentPrompt}`);
    }

    let sdkSessionId = resumeSessionId;

    let currentActiveStep = 1;
    const trackingCallbacks: StreamCallbacks = parsedSkillSteps
      ? {
          onEvent: (event) => {
            callbacks.onEvent(event);
            if (event.type === 'text') {
              const detected = detectStepFromText(event.text, parsedSkillSteps.isPhaseMode);
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
    const MAX_AUTO_CONTINUES = 5;
    let autoContinueCount = 0;
    const maxTurns = (options.maxTurns as number) || 50;

    // 메인 실행 루프: ASK_USER 응답 처리 + 턴 소진 시 자동 재개(최대 5회)
    while (true) {
      const opts: Record<string, unknown> = { ...options };
      if (sdkSessionId) opts.resume = sdkSessionId;

      const result = await runQuery(currentPrompt, opts, trackingCallbacks, abortController, fileLog);
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

      const hasPendingQuestions = result.pendingQuestions && result.pendingQuestions.questions.length > 0;
      const turnsExhausted = result.numTurns !== undefined && result.numTurns >= maxTurns;

      // 턴 소진(numTurns >= maxTurns) + 질문 없음 + 재개 횟수 미초과 → 자동 재개
      // Auto-continue if turns exhausted and no pending questions
      if (!hasPendingQuestions && turnsExhausted && autoContinueCount < MAX_AUTO_CONTINUES) {
        autoContinueCount++;
        log.info(`Turns exhausted (${result.numTurns}/${maxTurns}), auto-continuing (${autoContinueCount}/${MAX_AUTO_CONTINUES})`);
        currentPrompt = isEnglish
          ? 'Continue executing the skill from where you left off. Do not repeat completed work. Respond in English.'
          : '이전 작업을 이어서 계속 진행하세요. 중단된 지점부터 재개합니다.';
        continue;
      }

      // 사용자 질문이 없으면 스킬 완전 완료, 있으면 응답 대기 후 재개 필요
      // No askUserQuestion and no pendingQuestions → skill fully complete
      const fullyComplete = !hasPendingQuestions;
      log.info(`Skill execution completed (fullyComplete=${fullyComplete}, numTurns=${result.numTurns}, autoContinues=${autoContinueCount})`);

      // Mark all progress steps as complete when skill finishes
      if (parsedSkillSteps && fullyComplete) {
        callbacks.onEvent({ type: 'progress', activeStep: parsedSkillSteps.steps.length + 1 });
      }

      return { fullyComplete };
    }
  } catch (error: unknown) {
    if (abortController?.signal.aborted) {
      log.info(`Skill execution aborted for "${skillName}"`);
      return { fullyComplete: true };
    }
    const errMsg = (error as Error).message || 'Claude SDK execution failed';
    const errStack = (error as Error).stack || '';
    log.error(`SDK Error: ${errMsg}\n${errStack}`);
    await fileLog('ERROR', { message: errMsg, stack: errStack });
    callbacks.onEvent({
      type: 'error',
      message: errMsg,
    });
    return { fullyComplete: true };
  }
}

/**
 * 자유 프롬프트 실행 (스킬 없이 직접 대화)
 *
 * executeSkill과 달리 SKILL.md 없이 사용자 입력을 직접 SDK에 전달.
 * 에이전트 주입, ASK_USER 프로토콜은 동일하게 적용.
 * 프론트엔드의 "자유 입력" 모드에서 사용.
 *
 * @param input - 사용자 입력 텍스트
 * @param dmapProjectDir - DMAP 프로젝트 루트 경로
 * @param lang - 언어 코드
 * @param callbacks - SSE 스트리밍 콜백
 * @param resumeSessionId - 재개할 SDK 세션 ID
 * @param pluginId - 플러그인 ID
 * @param filePaths - 첨부 파일 경로 목록
 * @param abortController - 중단 컨트롤러
 */
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
  // Load all agents (OMC + plugin)
  const { omcAgents, allAgents, allAgentCount, pluginAgentGuide } = await loadAllAgents(pluginId);
  if (omcAgents) log.info(`Loaded ${Object.keys(omcAgents).length} OMC agents for prompt mode`);

  const isEnglish = lang && lang !== 'ko';

  // CLAUDECODE 환경변수 제거: Claude Code 세션 내부에서 서버 실행 시 중첩 세션 방지
  const cleanEnvPrompt = { ...process.env };
  delete cleanEnvPrompt.CLAUDECODE;

  const options: Record<string, unknown> = {
    model: getDefaultSdkModel(),
    permissionMode: 'acceptEdits',
    allowedTools: ['Bash'],
    cwd: dmapProjectDir,
    maxTurns: 50,
    env: cleanEnvPrompt,
    // 시스템 설치된 Claude Code CLI 사용 (Max 구독 OAuth 인증 공유)
    pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_PATH || resolveClaudeBinary(),
    disallowedTools: ['EnterPlanMode', 'ExitPlanMode', 'TodoWrite'],
    ...(allAgentCount > 0 ? { agents: allAgents } : {}),
    systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const, append: `${isEnglish ? `You MUST respond ONLY in English.\n\n` : ''}You are a helpful assistant working in the project directory. Execute the user's request using available tools (Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Task, etc.). Do NOT invoke other skills. Do NOT enter plan mode. Do NOT use TodoWrite.
AGENT DELEGATION: You MAY use the Task tool for parallel or complex work. Available OMC agents are injected with "omc-" prefix.${pluginAgentGuide}
${ASK_USER_INSTRUCTION}
${PERMISSION_AUTO_INSTRUCTION}` },
  };

  if (resumeSessionId) {
    options.resume = resumeSessionId;
  }

  try {
    const fileLog = await createFileLogger(dmapProjectDir, '__prompt__');

    const fileAttachment = buildFileAttachment(filePaths, !!isEnglish);

    let currentPrompt: string;
    // Slash command detection: SDK interprets '/' prefix as native slash command,
    // causing "Unknown skill" error. Rewrite to avoid SDK interception.
    // NOTE: SDK sessions don't load user plugins (~/.claude/plugins/), so the
    // Skill tool can't find OMC/plugin skills.
    const slashMatch = input.trimStart().match(/^\/(\S+)(?:\s+(.*))?$/);
    if (slashMatch) {
      const skillRef = slashMatch[1];
      const args = slashMatch[2]?.trim() || '';

      // OMC 스킬 감지: oh-my-claudecode: 접두사 또는 omc- 접두사
      // → OMC 플러그인 캐시에서 SKILL.md를 읽어 실행하도록 안내
      const omcMatch = skillRef.match(/^(?:oh-my-claudecode:)?(.+)$/);
      const omcSkillName = omcMatch?.[1] || skillRef;
      const isOmcSkill = skillRef.startsWith('oh-my-claudecode:') || skillRef.startsWith('omc-');
      const home = process.env.USERPROFILE || process.env.HOME || '~';
      const omcCachePath = `${home}/.claude/plugins/cache/omc/oh-my-claudecode`;

      if (isOmcSkill) {
        currentPrompt = isEnglish
          ? `The user wants to run the OMC slash command "/${skillRef}"${args ? ` with input: "${args}"` : ''}.\nThis OMC skill is not directly available via SDK. Find and execute its instructions:\n1. Use Glob to find: ${omcCachePath}/*/skills/${omcSkillName}/SKILL.md\n2. Read the SKILL.md file\n3. Follow the skill instructions using available tools (Bash, Read, Write, Glob, Grep, WebFetch, WebSearch, etc.)\nRespond in English.`
          : `사용자가 OMC 슬래시 커맨드 "/${skillRef}"를 실행하려 합니다${args ? `. 입력: "${args}"` : ''}.\n이 OMC 스킬은 SDK에서 직접 사용할 수 없습니다. 다음 단계로 실행하세요:\n1. Glob 도구로 찾기: ${omcCachePath}/*/skills/${omcSkillName}/SKILL.md\n2. 찾은 SKILL.md 파일을 Read 도구로 읽기\n3. 스킬 지시사항에 따라 사용 가능한 도구(Bash, Read, Write, Glob, Grep, WebFetch, WebSearch 등)로 작업 실행`;
      } else {
        // 일반 슬래시 명령 (비-OMC): 도구를 활용해 의도를 수행하도록 안내
        currentPrompt = isEnglish
          ? `The user wants to run the "/${skillRef}" slash command${args ? ` with input: "${args}"` : ''}. This slash command is not directly available in this session. Use available tools (Bash, Read, Write, Glob, Grep, etc.) to accomplish what this command would do. If you cannot determine what this command does, inform the user that this slash command is only available in the Claude Code CLI terminal. Respond in English.`
          : `사용자가 "/${skillRef}" 슬래시 커맨드를 실행하려 합니다${args ? `. 입력: "${args}"` : ''}. 이 슬래시 커맨드는 현재 세션에서 직접 사용할 수 없습니다. 사용 가능한 도구(Bash, Read, Write, Glob, Grep 등)를 활용하여 이 명령이 수행할 작업을 실행하세요. 명령의 기능을 알 수 없는 경우, 이 슬래시 커맨드는 Claude Code CLI 터미널에서만 사용 가능하다고 안내하세요.`;
      }
    } else if (resumeSessionId && input) {
      currentPrompt = isEnglish ? `${input}\n\nRespond in English.` : input;
    } else if (resumeSessionId) {
      currentPrompt = isEnglish
        ? 'Continue from where you left off. Respond in English.'
        : '중단된 지점부터 이어서 계속하세요.';
    } else {
      currentPrompt = isEnglish ? `${input}\n\nRespond in English.` : input;
    }
    currentPrompt += fileAttachment;

    log.info(`Prompt mode: ${currentPrompt.slice(0, 100)}...`);

    const result = await runQuery(currentPrompt, options, callbacks, abortController, fileLog);

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
  } catch (error: unknown) {
    if (abortController?.signal.aborted) {
      log.info('Prompt execution aborted');
      return { fullyComplete: true };
    }
    log.error('Prompt error:', error);
    callbacks.onEvent({ type: 'error', message: (error as Error).message || 'Prompt execution failed' });
    return { fullyComplete: true };
  }
}
