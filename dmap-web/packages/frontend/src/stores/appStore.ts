import { create } from 'zustand';
import type { ChatMessage, SkillMeta, ApprovalOption, QuestionItem, PluginInfo, Session } from '@dmap-web/shared';
import { PROMPT_SKILL } from '@dmap-web/shared';
import { useActivityStore } from './activityStore.js';

const API_BASE = '/api';
const SELECTED_PLUGIN_KEY = 'dmap-selected-plugin';

const DEFAULT_PLUGIN: PluginInfo = {
  id: localStorage.getItem(SELECTED_PLUGIN_KEY) || 'dmap',
  name: localStorage.getItem(SELECTED_PLUGIN_KEY) || 'dmap',
  displayNames: { ko: 'DMAP 빌더', en: 'DMAP Builder' },
  description: '',
  version: '',
  projectDir: '',
};

interface PendingApproval {
  id: string;
  question: string;
  options: ApprovalOption[];
  isTurnApproval?: boolean;
  parsedQuestions?: QuestionItem[];
}

interface AppState {
  // Plugins
  plugins: PluginInfo[];
  selectedPlugin: PluginInfo | null;

  // Skills
  skills: SkillMeta[];
  selectedSkill: SkillMeta | null;

  // Session
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isTranscriptView: boolean;

  // Session History
  sessions: Session[];

  // Approval
  pendingApproval: PendingApproval | null;

  // Skill switch confirmation
  pendingSkillSwitch: SkillMeta | null;
  // Centralized stream abort
  streamAbortController: AbortController | null;
  // Toast
  toastMessage: string | null;

  // Actions
  fetchPlugins: () => Promise<void>;
  selectPlugin: (plugin: PluginInfo) => void;
  addPlugin: (projectDir: string, displayNames: { ko: string; en: string }) => Promise<PluginInfo>;
  removePlugin: (pluginId: string) => Promise<void>;
  syncAgents: (pluginId: string) => Promise<{ count: number; agents: string[] }>;
  fetchSkills: () => Promise<void>;
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
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  plugins: [],
  selectedPlugin: DEFAULT_PLUGIN,
  skills: [],
  selectedSkill: null,
  sessionId: null,
  messages: [],
  isStreaming: false,
  isTranscriptView: false,
  sessions: [],
  pendingApproval: null,
  pendingSkillSwitch: null,
  streamAbortController: null,
  toastMessage: null,

  fetchPlugins: async () => {
    try {
      const res = await fetch(`${API_BASE}/plugins`);
      if (res.ok) {
        const data: PluginInfo[] = await res.json();
        set((state) => {
          // Restore last selected plugin or auto-select first
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
    useActivityStore.getState().clearActivity();
    set({ selectedPlugin: plugin, selectedSkill: null, messages: [], sessionId: null, pendingApproval: null, skills: [] });
  },

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
    const res = await fetch(`${API_BASE}/plugins/${pluginId}/agents/sync`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    return res.json();
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

  selectSkill: (skill) => {
    useActivityStore.getState().clearActivity();
    set({ selectedSkill: skill, messages: [], sessionId: null, pendingApproval: null, isTranscriptView: false });
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
    set({ messages: [], sessionId: null, pendingApproval: null, isStreaming: false, isTranscriptView: false }),

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

  loadTranscriptSession: async (transcriptId, summary) => {
    // transcriptId = sdkSessionId = JSONL filename
    // Find the dmap-web session linked to this sdkSessionId for resume
    const dmapSession = useAppStore.getState().sessions.find(s => s.sdkSessionId === transcriptId);
    set({
      isTranscriptView: true,
      sessionId: dmapSession?.id || null,
      messages: [{ id: 'transcript-loading', role: 'system' as const, content: '...', timestamp: new Date().toISOString() }],
      pendingApproval: null,
    });
    try {
      const res = await fetch(`${API_BASE}/transcripts/${transcriptId}`);
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
    set({ isTranscriptView: false, messages: [], sessionId: null, pendingApproval: null });
  },

  switchSkillChain: (newSkill, newSessionId) => {
    useActivityStore.getState().clearActivity();
    set((state) => ({
      selectedSkill: newSkill,
      sessionId: newSessionId,
      pendingApproval: null,
      // Keep messages but add transition marker
      messages: [...state.messages, {
        id: crypto.randomUUID(),
        role: 'system' as const,
        content: `\uD83D\uDD04 ${newSkill.displayName}`,
        timestamp: new Date().toISOString(),
      }],
    }));
  },

  showToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: null }),
}));
