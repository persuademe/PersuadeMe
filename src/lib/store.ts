"use client";

import { create } from "zustand";

// Auth states
export type AuthState = "disconnected" | "authenticated" | "authorized";

interface User {
  id: string;
  email: string;
  walletAddress: string;
  accessKey?: string;
  isVerified: boolean;
}

interface AuthStore {
  // State
  authState: AuthState;
  user: User | null;
  isLoading: boolean;
  balance: number;

  // Actions
  setAuthState: (state: AuthState) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setBalance: (balance: number) => void;
  login: (user: User) => void;
  logout: () => void;
  generateAccessKey: () => string;
  connectWallet: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  authState: "disconnected",
  user: null,
  isLoading: false,
  balance: 1250.0, // Mock balance for testing

  // Actions
  setAuthState: (state) => set({ authState: state }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setBalance: (balance) => set({ balance }),

  login: (user) => {
    set({
      user,
      authState: user.accessKey ? "authorized" : "authenticated",
    });
  },

  logout: () => {
    set({
      user: null,
      authState: "disconnected",
      balance: 0,
    });
  },

  generateAccessKey: () => {
    const key = generateKey();
    set((state) => ({
      user: state.user ? { ...state.user, accessKey: key } : null,
    }));
    return key;
  },

  connectWallet: async () => {
    set({ isLoading: true });
    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1500));
    set({ isLoading: false });
  },
}));

// Mock key generator
function generateKey(): string {
  const hexChars = "0123456789ABCDEF";
  let key = "";
  for (let i = 0; i < 32; i++) {
    if (i > 0 && i % 8 === 0) key += "-";
    key += hexChars[Math.floor(Math.random() * 16)];
  }
  return key;
}

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
