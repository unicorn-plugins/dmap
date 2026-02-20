/**
 * 메인 애플리케이션 스토어 (Zustand) - 전역 상태 및 API 액션 관리
 *
 * 관리 영역:
 * - 플러그인: 목록, 선택, 추가/삭제, 에이전트 동기화
 * - 스킬: 목록, 선택, 메뉴 설정
 * - 세션: 현재 세션, 메시지, 스트리밍 상태, 이력
 * - 승인: 사용자 응답 대기 (ApprovalDialog, QuestionFormDialog)
 * - 스킬 체인: 스킬 전환 시 세션/메시지 전이
 *
 * activityStore 연동: selectPlugin/selectSkill/switchSkillChain 시 clearActivity() 호출
 * localStorage 연동: 선택된 플러그인 ID 영속화 (SELECTED_PLUGIN_KEY)
 *
 * @module stores/appStore
 */
import { create } from 'zustand';
import type { ChatMessage, SkillMeta, ApprovalOption, QuestionItem, PluginInfo, Session, MenuConfig } from '@dmap-web/shared';
import { PROMPT_SKILL, API_BASE } from '@dmap-web/shared';
import { useActivityStore } from './activityStore.js';
const SELECTED_PLUGIN_KEY = 'dmap-selected-plugin';

const DEFAULT_PLUGIN: PluginInfo = {
  id: localStorage.getItem(SELECTED_PLUGIN_KEY) || 'dmap',
  name: localStorage.getItem(SELECTED_PLUGIN_KEY) || 'dmap',
  displayNames: { ko: 'DMAP 빌더', en: 'DMAP Builder' },
  description: '',
  version: '',
  projectDir: '',
};

/**
 * 사용자 응답 대기 상태
 * @property isTurnApproval - true면 턴 승인 바(TurnApprovalBar)로 표시
 * @property parsedQuestions - ASK_USER에서 파싱된 구조화 질문 (QuestionFormDialog용)
 */
interface PendingApproval {
  id: string;
  question: string;
  options: ApprovalOption[];
  isTurnApproval?: boolean;
  parsedQuestions?: QuestionItem[];
}

/** 앱 전역 상태 + 액션 인터페이스 */
interface AppState {
  // Plugins
  plugins: PluginInfo[];
  selectedPlugin: PluginInfo | null;

  // Skills
  skills: SkillMeta[];
  selectedSkill: SkillMeta | null;
  menus: MenuConfig | null;

  // Session
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isTranscriptView: boolean;
  transcriptId: string | null;
  transcriptSummary: string;

  // Session History
  sessions: Session[];

  // Approval
  pendingApproval: PendingApproval | null;

  // Skill switch confirmation
  pendingSkillSwitch: SkillMeta | null;
  // Centralized stream abort
  streamAbortController: AbortController | null;

  // Skill relevance suggestion
  skillSuggestion: {
    suggestedSkill: string;
    suggestedSkillDisplayName: string;
    reason: string;
    isPromptMode: boolean;
  } | null;

  // Actions
  fetchPlugins: () => Promise<void>;
  selectPlugin: (plugin: PluginInfo) => void;
  addPlugin: (projectDir: string, displayNames: { ko: string; en: string }) => Promise<PluginInfo>;
  installPlugin: (type: 'github' | 'local', source: string, displayNames?: { ko: string; en: string }) => Promise<any>;
  removePlugin: (pluginId: string) => Promise<void>;
  syncAgents: (pluginId: string) => Promise<{ count: number; agents: string[] }>;
  updatePluginDir: (pluginId: string, workingDir: string) => Promise<void>;
  fetchSkills: () => Promise<void>;
  fetchMenus: () => Promise<void>;
  refreshMenus: () => Promise<void>;
  saveMenus: (menus: MenuConfig) => Promise<void>;
  selectSkill: (skill: SkillMeta) => void;
  setSessionId: (id: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  appendToLastMessage: (text: string) => void;
  setStreaming: (streaming: boolean) => void;
  setPendingApproval: (approval: PendingApproval | null) => void;
  clearChat: () => void;
  setPendingSkillSwitch: (skill: SkillMeta | null) => void;
  confirmSkillSwitch: () => void;
  cancelSkillSwitch: () => void;
  setStreamAbortController: (controller: AbortController | null) => void;
  abortCurrentStream: () => void;
  fetchSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  resumeSession: (session: Session, skill: SkillMeta | null) => void;
  loadTranscriptSession: (sessionId: string, summary: string) => Promise<void>;
  clearTranscriptView: () => void;
  switchSkillChain: (newSkill: SkillMeta, newSessionId: string) => void;
  setSkillSuggestion: (suggestion: AppState['skillSuggestion']) => void;
  dismissSkillSuggestion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  plugins: [],
  selectedPlugin: DEFAULT_PLUGIN,
  skills: [],
  selectedSkill: null,
  menus: null,
  sessionId: null,
  messages: [],
  isStreaming: false,
  isTranscriptView: false,
  transcriptId: null,
  transcriptSummary: '',
  sessions: [],
  pendingApproval: null,
  pendingSkillSwitch: null,
  streamAbortController: null,
  skillSuggestion: null,

  fetchPlugins: async () => {
    try {
      const res = await fetch(`${API_BASE}/plugins`);
      if (res.ok) {
        const data: PluginInfo[] = await res.json();
        set((state) => {
          // localStorage에서 마지막 선택 플러그인 복원, 없으면 첫 번째 플러그인 자동 선택
          const storedId = localStorage.getItem(SELECTED_PLUGIN_KEY);
          const selected = (storedId && data.find((p) => p.id === storedId))
            || (state.selectedPlugin && data.find((p) => p.id === state.selectedPlugin!.id))
            || data[0] || null;
          return { plugins: data, selectedPlugin: selected };
        });
      }
    } catch {
      // Keep current plugins on error
    }
  },

  selectPlugin: (plugin) => {
    localStorage.setItem(SELECTED_PLUGIN_KEY, plugin.id);
    // 플러그인 전환 시 전체 상태 초기화: 스킬/메시지/세션/승인/메뉴 + activityStore 클리어
    useActivityStore.getState().clearActivity();
    set({ selectedPlugin: plugin, selectedSkill: null, messages: [], sessionId: null, pendingApproval: null, skills: [], menus: null });
  },

  /** 새 플러그인 등록 → 에이전트 자동 동기화 → 플러그인 목록 새로고침 */
  addPlugin: async (projectDir: string, displayNames: { ko: string; en: string }) => {
    const res = await fetch(`${API_BASE}/plugins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir, displayNames }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const plugin: PluginInfo = await res.json();
    await useAppStore.getState().fetchPlugins();
    return plugin;
  },

  /** CLI 기반 플러그인 설치 (GitHub 또는 로컬) */
  installPlugin: async (type: 'github' | 'local', source: string, displayNames?: { ko: string; en: string }) => {
    const res = await fetch(`${API_BASE}/plugins/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, source, displayNames }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const result = await res.json();
    await useAppStore.getState().fetchPlugins();
    return result;
  },

  /** 플러그인 삭제 → 삭제된 플러그인이 선택 중이면 첫 번째 플러그인으로 자동 전환 */
  removePlugin: async (pluginId: string) => {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    // Refresh plugin list and switch to DMAP if deleted plugin was selected
    const wasSelected = useAppStore.getState().selectedPlugin?.id === pluginId;
    await useAppStore.getState().fetchPlugins();
    if (wasSelected) {
      const firstPlugin = useAppStore.getState().plugins[0];
      if (firstPlugin) {
        useAppStore.getState().selectPlugin(firstPlugin);
        await useAppStore.getState().fetchSkills();
      }
    }
  },

  syncAgents: async (pluginId: string) => {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}/sync`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
  },

  /** 외부 플러그인의 workingDir 변경 → 해당 플러그인의 작업 디렉토리만 로컬 갱신 (메뉴/스킬 재로드 없음) */
  updatePluginDir: async (pluginId: string, workingDir: string) => {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workingDir }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    set((state) => {
      const updatedPlugins = state.plugins.map(p =>
        p.id === pluginId ? { ...p, workingDir } : p
      );
      const updatedSelected = state.selectedPlugin?.id === pluginId
        ? { ...state.selectedPlugin, workingDir }
        : state.selectedPlugin;
      return { plugins: updatedPlugins, selectedPlugin: updatedSelected };
    });
  },

  fetchSkills: async () => {
    try {
      const pluginId = useAppStore.getState().selectedPlugin?.id;
      const url = pluginId ? `${API_BASE}/skills?pluginId=${pluginId}` : `${API_BASE}/skills`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ skills: data });
      }
    } catch {
      // Keep current skills on error
    }
  },

  fetchMenus: async () => {
    try {
      const pluginId = useAppStore.getState().selectedPlugin?.id;
      if (!pluginId) return;
      const res = await fetch(`${API_BASE}/plugins/${pluginId}/menus`);
      if (res.ok) {
        const data: MenuConfig = await res.json();
        set({ menus: data });
      }
    } catch {
      // Keep current menus on error
    }
  },

  /** 외부 플러그인 메뉴 갱신 - 디스크에서 재스캔하여 external 카테고리 동기화 */
  refreshMenus: async () => {
    try {
      const pluginId = useAppStore.getState().selectedPlugin?.id;
      if (!pluginId) return;
      const res = await fetch(`${API_BASE}/plugins/${pluginId}/menus/refresh`, {
        method: 'POST',
      });
      if (res.ok) {
        const data: MenuConfig = await res.json();
        set({ menus: data });
      }
    } catch {
      // Keep current menus on error
    }
  },

  saveMenus: async (menus: MenuConfig) => {
    const pluginId = useAppStore.getState().selectedPlugin?.id;
    if (!pluginId) return;
    const res = await fetch(`${API_BASE}/plugins/${pluginId}/menus`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menus),
    });
    if (res.ok) {
      set({ menus });
    }
  },

  selectSkill: (skill) => {
    // 스킬 전환 시 메시지/세션/승인 초기화 + activityStore 클리어
    useActivityStore.getState().clearActivity();
    set({ selectedSkill: skill, messages: [], sessionId: null, pendingApproval: null, isTranscriptView: false, skillSuggestion: null });
  },

  setSessionId: (id) => set({ sessionId: id }),

  addMessage: (msg) => {
    const message: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
  },

  appendToLastMessage: (text) => {
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      // 마지막 메시지가 assistant면 텍스트 이어붙이기, 아니면 새 assistant 메시지 생성
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + text };
      } else {
        msgs.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
        });
      }
      return { messages: msgs };
    });
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPendingApproval: (approval) => set({ pendingApproval: approval }),
  clearChat: () =>
    set({ messages: [], sessionId: null, pendingApproval: null, isStreaming: false, isTranscriptView: false, skillSuggestion: null }),

  setPendingSkillSwitch: (skill) => set({ pendingSkillSwitch: skill }),

  confirmSkillSwitch: () => {
    const { pendingSkillSwitch } = useAppStore.getState();
    if (!pendingSkillSwitch) return;
    set({ pendingSkillSwitch: null });
    useAppStore.getState().selectSkill(pendingSkillSwitch);
  },

  cancelSkillSwitch: () => set({ pendingSkillSwitch: null }),

  setStreamAbortController: (controller) => set({ streamAbortController: controller }),

  abortCurrentStream: () => {
    const { streamAbortController } = useAppStore.getState();
    streamAbortController?.abort();
    set({ streamAbortController: null, isStreaming: false });
  },

  fetchSessions: async () => {
    try {
      const pluginId = useAppStore.getState().selectedPlugin?.id;
      const url = pluginId ? `${API_BASE}/sessions?pluginId=${pluginId}` : `${API_BASE}/sessions`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ sessions: data.sessions || [] });
      }
    } catch {
      // Keep current sessions on error
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
      set((state) => ({ sessions: state.sessions.filter(s => s.id !== sessionId) }));
    } catch {
      // ignore
    }
  },

  /** 세션 이력에서 이전 세션 재개 - __prompt__ 세션은 PROMPT_SKILL로 매핑 */
  resumeSession: (session, skill) => {
    const targetSkill = session.skillName === '__prompt__'
      ? PROMPT_SKILL
      : skill;
    if (!targetSkill) return;
    set({
      selectedSkill: targetSkill,
      sessionId: session.id,
      messages: [{
        id: crypto.randomUUID(),
        role: 'system' as const,
        content: `\uD83D\uDCC2 ${session.preview || session.skillName}`,
        timestamp: new Date().toISOString(),
      }],
      pendingApproval: null,
    });
  },

  /** SDK 트랜스크립트 로드 - sdkSessionId로 dmap 세션 매핑하여 resume 지원 */
  loadTranscriptSession: async (transcriptId, summary) => {
    // transcriptId = sdkSessionId = JSONL filename
    // Find the dmap-web session linked to this sdkSessionId for resume
    const dmapSession = useAppStore.getState().sessions.find(s => s.sdkSessionId === transcriptId);
    set({
      isTranscriptView: true,
      transcriptId,
      transcriptSummary: summary,
      sessionId: dmapSession?.id || null,
      messages: [{ id: 'transcript-loading', role: 'system' as const, content: '...', timestamp: new Date().toISOString() }],
      pendingApproval: null,
    });
    try {
      const pluginId = useAppStore.getState().selectedPlugin?.id;
      const transcriptUrl = pluginId
        ? `${API_BASE}/transcripts/${transcriptId}?pluginId=${pluginId}`
        : `${API_BASE}/transcripts/${transcriptId}`;
      const res = await fetch(transcriptUrl);
      if (!res.ok) throw new Error('Failed to fetch transcript');
      const data = await res.json();
      const msgs: ChatMessage[] = (data.messages || []).map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
      }));
      if (msgs.length === 0) {
        msgs.push({ id: 'empty', role: 'system' as const, content: summary, timestamp: new Date().toISOString() });
      }
      set({ messages: msgs });
    } catch {
      set({ messages: [{ id: 'error', role: 'system' as const, content: 'Failed to load transcript', timestamp: new Date().toISOString() }] });
    }
  },

  clearTranscriptView: () => {
    set({ isTranscriptView: false, transcriptId: null, transcriptSummary: '', messages: [], sessionId: null, pendingApproval: null });
  },

  setSkillSuggestion: (suggestion) => set({ skillSuggestion: suggestion }),
  dismissSkillSuggestion: () => set({ skillSuggestion: null }),

  /** 스킬 체인 전환 - 새 스킬/세션으로 전환 + 전환 마커 메시지 추가 + activityStore 클리어 */
  switchSkillChain: (newSkill, newSessionId) => {
    useActivityStore.getState().clearActivity();
    set((state) => ({
      selectedSkill: newSkill,
      sessionId: newSessionId,
      pendingApproval: null,
      skillSuggestion: null,
      // Keep messages but add transition marker
      messages: [...state.messages, {
        id: crypto.randomUUID(),
        role: 'system' as const,
        content: `\uD83D\uDD04 ${newSkill.displayName}`,
        timestamp: new Date().toISOString(),
      }],
    }));
  },

}));
