/**
 * 공유 타입 정의 - 백엔드/프론트엔드 간 공유되는 인터페이스 및 타입
 *
 * 주요 카테고리:
 * - SSE 이벤트: 백엔드→프론트엔드 실시간 스트리밍 이벤트 타입 (12종)
 * - 메뉴: 사이드바 메뉴 구성 (core 하위카테고리 + utility + external)
 * - 스킬: SKILL.md 기반 스킬 메타데이터
 * - 세션: 스킬 실행 세션 상태 및 이력
 * - 플러그인: 등록된 플러그인 정보
 * - API: 요청/응답 DTO
 *
 * @module shared/types
 */

// SSE Event Types (Flat structure matching backend implementation)
/** SSE 이벤트 타입 유니온 - 백엔드 claude-sdk-client에서 생성, 프론트엔드 useSkillStream에서 소비 */
export type SSEEventType = 'text' | 'tool' | 'agent' | 'usage' | 'progress' | 'approval' | 'questions' | 'complete' | 'error' | 'done' | 'skill_changed' | 'skill_suggestion';

/** 모델 텍스트 출력 이벤트 - ChatPanel의 MessageBubble에 렌더링 */
export interface SSETextEvent {
  type: 'text';
  text: string;
}

/** 도구 호출 이벤트 - ActivityPanel의 ToolSection에 표시 */
export interface SSEToolEvent {
  type: 'tool';
  name: string;
  id: string;
  description?: string;
}

/** 에이전트 위임 이벤트 - ActivityPanel의 AgentSection에 표시 */
export interface SSEAgentEvent {
  type: 'agent';
  id: string;
  subagentType: string;
  model: string;
  description?: string;
}

/** 토큰 사용량/비용 이벤트 - ActivityPanel의 UsageFooter에 표시 */
export interface SSEUsageEvent {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalCostUsd: number;
  durationMs: number;
  numTurns: number;
}

/** 스킬 진행률 이벤트 - Phase/Step 단계 정보, ActivityPanel의 ProgressSection에 표시 */
export interface SSEProgressEvent {
  type: 'progress';
  steps?: Array<{ step: number; label: string }>;
  activeStep?: number;
}

export interface ApprovalOption {
  label: string;
  description?: string;
}

/** 승인 요청 이벤트 (레거시) - ApprovalDialog에서 사용 */
export interface SSEApprovalEvent {
  type: 'approval';
  id: string;
  sessionId: string;
  question: string;
  options: ApprovalOption[];
  // TODO: multi-select 지원 시 활성화
  multiSelect?: boolean;
}

/** 스킬 실행 완료 이벤트 - fullyComplete: true면 완전 완료, false면 사용자 응답 대기 */
export interface SSECompleteEvent {
  type: 'complete';
  sessionId: string;
  fullyComplete?: boolean;
}

/** 실행 에러 이벤트 - ChatPanel에 에러 메시지 표시 */
export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

/** SSE 스트림 종료 이벤트 - endSSE()에서 마지막으로 전송 */
export interface SSEDoneEvent {
  type: 'done';
}

/** 스킬 체인 이벤트 - CHAIN>>> 감지 시 새 스킬로 전환, newSessionId로 새 세션 연결 */
export interface SSESkillChangedEvent {
  type: 'skill_changed';
  newSkillName: string;
  newSessionId?: string;
  chainInput: string;
}

/** 스킬 관련성 불일치 추천 이벤트 - 사용자 입력이 현재 스킬과 무관할 때 적합한 스킬 추천 */
export interface SSESkillSuggestionEvent {
  type: 'skill_suggestion';
  suggestedSkill: string;
  reason: string;
  isPromptMode: boolean;
}

/** 구조화된 질문 항목 - ASK_USER 프로토콜로 모델이 생성, QuestionFormDialog에서 렌더링 */
export interface QuestionItem {
  question: string;
  description?: string;
  suggestion?: string;
  example?: string;
  type?: 'text' | 'radio' | 'checkbox';
  options?: string[];
}

/** 구조화된 질문 이벤트 - ASK_USER 블록 파싱 결과 */
export interface SSEQuestionsEvent {
  type: 'questions';
  title: string;
  questions: QuestionItem[];
}

/** SSE 이벤트 유니온 타입 - 12종의 이벤트를 discriminated union으로 정의 */
export type SSEEvent =
  | SSETextEvent
  | SSEToolEvent
  | SSEAgentEvent
  | SSEUsageEvent
  | SSEProgressEvent
  | SSEApprovalEvent
  | SSEQuestionsEvent
  | SSECompleteEvent
  | SSEErrorEvent
  | SSEDoneEvent
  | SSESkillChangedEvent
  | SSESkillSuggestionEvent;

// Activity Panel Types
/** 도구 호출 활동 로그 - 타임스탬프 포함, ActivityPanel에서 시간순 표시 */
export interface ActivityToolEvent {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
}

// Menu Types
/** 메뉴 스킬 항목 - 스킬명 + 다국어 라벨 */
export interface MenuSkillItem {
  name: string;
  labels: { ko: string; en: string };
}

/** 메뉴 하위 카테고리 - core 스킬을 의미 기반으로 그룹핑 (AI 추천 또는 수동 편집) */
export interface MenuSubcategory {
  id: string;
  labels: { ko: string; en: string };
  skills: MenuSkillItem[];
}

/** 사이드바 메뉴 설정 - core(하위카테고리별) + utility(고정순서) + external(알파벳순) */
export interface MenuConfig {
  core: MenuSubcategory[];
  utility: MenuSkillItem[];
  external: MenuSkillItem[];
}

// Skill Types
/** 스킬 메타데이터 - SKILL.md frontmatter에서 파싱, 사이드바 메뉴 및 스킬 카드에 표시 */
export interface SkillMeta {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  category: 'core' | 'setup' | 'utility' | 'external';
  hasApprovalGates: boolean;
}

// Session Types
/** 세션 토큰 사용량 요약 - 세션 목록에서 비용 정보 표시용 */
export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  durationMs: number;
}

/**
 * 스킬 실행 세션
 *
 * 상태 전이: active → waiting(사용자 응답 대기) → active → completed/error/aborted
 * sdkSessionId: Claude SDK 세션 ID (SDK resume 옵션에 사용)
 * previousSkillName: 스킬 체인 시 이전 스킬명 (결과 파일 참조용)
 */
export interface Session {
  id: string;
  sdkSessionId?: string;
  skillName: string;
  status: 'active' | 'waiting' | 'completed' | 'error' | 'aborted';
  createdAt: string;
  lastActivity: string;
  preview?: string;
  pluginId?: string;
  skillIcon?: string;
  previousSkillName?: string;
  usage?: SessionUsage;
}

/** 채팅 메시지 - user/assistant/system 역할, 도구 호출 시 toolName 포함 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolName?: string;
  isApproval?: boolean;
  approvalOptions?: ApprovalOption[];
}

// Plugin Types
/** 등록된 플러그인 정보 - DMAP 기본 플러그인 + 외부 플러그인 공통 구조 */
export interface PluginInfo {
  id: string;
  name: string;
  displayNames: { ko: string; en: string };
  description: string;
  version: string;
  projectDir: string;
  workingDir?: string;
  setupCompleted?: boolean;
}

// API Request/Response
/** 스킬 실행 요청 DTO - POST /api/skills/:name/execute 요청 바디 */
export interface SkillExecuteRequest {
  input?: string;
  sessionId?: string;
  pluginId?: string;
  lang?: string;
  filePaths?: string[];
}

/** 세션 응답 주입 DTO - POST /api/sessions/:id/respond 요청 바디 */
export interface SessionRespondRequest {
  response: string;
}
