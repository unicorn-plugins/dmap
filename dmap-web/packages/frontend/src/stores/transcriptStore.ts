import { create } from 'zustand';

const API_BASE = '/api';

export interface TranscriptSession {
  id: string;
  summary: string;
  lastModified: string;
  fileSize: number;
  messageCount: number;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TranscriptState {
  // View mode
  isOpen: boolean;

  // Session list
  sessions: TranscriptSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  searchQuery: string;

  // Selected session messages
  selectedSessionId: string | null;
  selectedSessionSummary: string | null;
  messages: TranscriptMessage[];
  messagesLoading: boolean;
  messagesError: string | null;

  // Actions
  open: () => void;
  close: () => void;
  setSearchQuery: (query: string) => void;
  fetchSessions: () => Promise<void>;
  selectSession: (sessionId: string, summary: string) => Promise<void>;
  clearSelection: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  isOpen: false,
  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
  searchQuery: '',
  selectedSessionId: null,
  selectedSessionSummary: null,
  messages: [],
  messagesLoading: false,
  messagesError: null,

  open: () => {
    set({ isOpen: true });
    useTranscriptStore.getState().fetchSessions();
  },

  close: () => {
    set({
      isOpen: false,
      selectedSessionId: null,
      selectedSessionSummary: null,
      messages: [],
      messagesError: null,
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchSessions: async () => {
    set({ sessionsLoading: true, sessionsError: null });
    try {
      const res = await fetch(`${API_BASE}/transcripts`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      set({ sessions: data.sessions || [], sessionsLoading: false });
    } catch {
      set({ sessionsError: 'Failed to load sessions', sessionsLoading: false });
    }
  },

  selectSession: async (sessionId, summary) => {
    set({
      selectedSessionId: sessionId,
      selectedSessionSummary: summary,
      messagesLoading: true,
      messagesError: null,
      messages: [],
    });
    try {
      const res = await fetch(`${API_BASE}/transcripts/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      set({ messages: data.messages || [], messagesLoading: false });
    } catch {
      set({ messagesError: 'Failed to load messages', messagesLoading: false });
    }
  },

  clearSelection: () => {
    set({
      selectedSessionId: null,
      selectedSessionSummary: null,
      messages: [],
      messagesError: null,
    });
  },
}));
