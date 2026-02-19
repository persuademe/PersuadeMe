"use client";

import { create } from "zustand";

// Auth states
export type AuthState = "disconnected" | "authenticated" | "authorized";

interface User {
  id: string;
  email: string;
  walletAddress: string;
  apiKey?: string;
  isVerified: boolean;
}

interface AuthStore {
  // State
  authState: AuthState;
  user: User | null;
  apiKey: string | null;
  isLoading: boolean;
  balance: number;

  // Actions
  setAuthState: (state: AuthState) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setBalance: (balance: number) => void;
  setApiKey: (apiKey: string) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  authState: "disconnected",
  user: null,
  apiKey: null,
  isLoading: false,
  balance: 0,

  // Actions
  setAuthState: (state) => set({ authState: state }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setBalance: (balance) => set({ balance }),
  setApiKey: (apiKey) =>
    set((state) => ({
      apiKey,
      user: state.user ? { ...state.user, apiKey } : null,
      authState: apiKey ? "authorized" : "authenticated",
    })),

  login: (user) => {
    set({
      user,
      apiKey: user.apiKey || null,
      authState: user.apiKey ? "authorized" : "authenticated",
    });
  },

  logout: () => {
    set({
      user: null,
      apiKey: null,
      authState: "disconnected",
      balance: 0,
    });
  },
}));

// Dashboard state for terminal and submissions
interface DashboardStore {
  terminalLines: TerminalLine[];
  submissions: Submission[];
  timerSeconds: number;
  isTimerActive: boolean;
  addTerminalLine: (line: Omit<TerminalLine, "id">) => void;
  clearTerminal: () => void;
  addSubmission: (submission: Submission) => void;
  setTimer: (seconds: number) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

interface TerminalLine {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "system";
  content: string;
  agent?: string;
}

interface Submission {
  id: string;
  topic: string;
  argument: string;
  timestamp: string;
  status: "pending" | "judged" | "rewarded";
  score?: number;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  terminalLines: [],
  submissions: [],
  timerSeconds: 7200, // 2 hours for $100 payout
  isTimerActive: true,

  addTerminalLine: (line) => {
    const newLine = { ...line, id: Date.now().toString() };
    set((state) => ({
      terminalLines: [...state.terminalLines.slice(-50), newLine],
    }));
  },

  clearTerminal: () => set({ terminalLines: [] }),

  addSubmission: (submission) => {
    set((state) => ({
      submissions: [...state.submissions.slice(-9), submission],
    }));
  },

  setTimer: (seconds) => set({ timerSeconds: seconds }),

  startTimer: () => set({ isTimerActive: true }),

  stopTimer: () => set({ isTimerActive: false }),

  resetTimer: () => set({ timerSeconds: 7200, isTimerActive: true }),
}));
