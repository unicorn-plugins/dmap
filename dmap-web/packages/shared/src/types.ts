// SSE Event Types (Flat structure matching backend implementation)
export type SSEEventType = 'text' | 'tool' | 'agent' | 'usage' | 'progress' | 'approval' | 'questions' | 'complete' | 'error' | 'done';

export interface SSETextEvent {
  type: 'text';
  text: string;
}

export interface SSEToolEvent {
  type: 'tool';
  name: string;
  id: string;
  description?: string;
}

export interface SSEAgentEvent {
  type: 'agent';
  id: string;
  subagentType: string;
  model: string;
  description?: string;
}

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

export interface SSEProgressEvent {
  type: 'progress';
  steps?: Array<{ step: number; label: string }>;
  activeStep?: number;
}

export interface ApprovalOption {
  label: string;
  description?: string;
}

export interface SSEApprovalEvent {
  type: 'approval';
  id: string;
  sessionId: string;
  question: string;
  options: ApprovalOption[];
  multiSelect?: boolean;
}

export interface SSECompleteEvent {
  type: 'complete';
  sessionId: string;
  fullyComplete?: boolean;
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export interface SSEDoneEvent {
  type: 'done';
}

export interface QuestionItem {
  question: string;
  description?: string;
  suggestion?: string;
  example?: string;
  type?: 'text' | 'radio' | 'checkbox';
  options?: string[];
}

export interface SSEQuestionsEvent {
  type: 'questions';
  title: string;
  questions: QuestionItem[];
}

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
  | SSEDoneEvent;

// Activity Panel Types
export interface ActivityToolEvent {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
}

export interface ActivityAgentEvent {
  id: string;
  subagentType: string;
  displayName: string;
  model: string;
  tier: 'low' | 'medium' | 'high';
  description?: string;
  status: 'active' | 'completed' | 'error';
  startedAt: string;
  completedAt?: string;
}

// Skill Types
export interface SkillInput {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'file' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface SkillMeta {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  category: 'core' | 'setup' | 'utility' | 'external';
  hasApprovalGates: boolean;
  inputs?: SkillInput[];
}

// Session Types
export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  durationMs: number;
}

export interface Session {
  id: string;
  sdkSessionId?: string;
  skillName: string;
  status: 'active' | 'waiting' | 'completed' | 'error';
  createdAt: string;
  lastActivity: string;
  preview?: string;
  pluginId?: string;
  skillIcon?: string;
  usage?: SessionUsage;
}

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
export interface PluginInfo {
  id: string;
  name: string;
  displayNames: { ko: string; en: string };
  description: string;
  version: string;
  projectDir: string;
}

// API Request/Response
export interface SkillExecuteRequest {
  input?: string;
  sessionId?: string;
  pluginId?: string;
}

export interface SessionRespondRequest {
  response: string;
  selectedOptions?: string[];
}
