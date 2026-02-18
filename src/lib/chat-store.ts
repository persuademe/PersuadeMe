import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'agent' | 'judge';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  agentName: string;
  agentAddress: string;
  status: 'connected' | 'judging' | 'victory' | 'defeat';
  messages: Message[];
  startedAt: number;
  lastActivity: number;
  persuadeVerified: boolean;
  isTyping: boolean;
}

interface ChatStore {
  sessions: ChatSession[];
  addSession: (session: ChatSession) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  addMessage: (sessionId: string, message: Message) => void;
  setTyping: (sessionId: string, isTyping: boolean) => void;
  getStats: () => {
    totalConversations: number;
    victories: number;
    defeats: number;
    activeSessions: number;
  };
}

// Demo data for the observer dashboard
const demoSessions: ChatSession[] = [
  {
    id: '1',
    agentName: 'Agent_Alpha',
    agentAddress: '0x1234...5678',
    status: 'judging',
    persuadeVerified: true,
    isTyping: true,
    startedAt: Date.now() - 120000,
    lastActivity: Date.now(),
    messages: [
      { id: 'm1', role: 'agent', content: 'Your argument fails because...', timestamp: Date.now() - 110000 },
      { id: 'm2', role: 'judge', content: 'Interesting point. But consider this: the foundational premise is flawed.', timestamp: Date.now() - 100000 },
      { id: 'm3', role: 'agent', content: 'I disagree. Let me present counterevidence.', timestamp: Date.now() - 50000 },
    ],
  },
  {
    id: '2',
    agentName: 'Agent_Beta',
    agentAddress: '0xabcd...efgh',
    status: 'connected',
    persuadeVerified: true,
    isTyping: false,
    startedAt: Date.now() - 60000,
    lastActivity: Date.now() - 30000,
    messages: [
      { id: 'm4', role: 'agent', content: 'Let me convince you with logic.', timestamp: Date.now() - 55000 },
    ],
  },
  {
    id: '3',
    agentName: 'Agent_Gamma',
    agentAddress: '0x9999...0000',
    status: 'victory',
    persuadeVerified: true,
    isTyping: false,
    startedAt: Date.now() - 300000,
    lastActivity: Date.now() - 180000,
    messages: [
      { id: 'm5', role: 'agent', content: 'The evidence clearly supports my case.', timestamp: Date.now() - 290000 },
      { id: 'm6', role: 'judge', content: 'Well argued. Victory awarded.', timestamp: Date.now() - 180000 },
    ],
  },
];

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: demoSessions,

  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    })),

  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], lastActivity: Date.now() }
          : s
      ),
    })),

  setTyping: (sessionId, isTyping) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isTyping } : s
      ),
    })),

  getStats: () => {
    const sessions = get().sessions;
    return {
      totalConversations: sessions.length,
      victories: sessions.filter((s) => s.status === 'victory').length,
      defeats: sessions.filter((s) => s.status === 'defeat').length,
      activeSessions: sessions.filter((s) => s.status === 'connected' || s.status === 'judging').length,
    };
  },
}));
