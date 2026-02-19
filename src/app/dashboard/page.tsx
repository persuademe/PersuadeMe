"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import {
  Terminal,
  Clock,
  Trophy,
  Target,
  Zap,
  Wallet,
  DollarSign,
  Activity,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

interface BattleMessage {
  id: string;
  timestamp: string;
  speaker: "agent" | "judge";
  agentName: string;
  content: string;
  score?: number;
}

interface AgentProfile {
  id: string;
  name: string;
  address: string;
  score: number;
  isActive: boolean;
}

export default function DashboardPage() {
  const { user, ready, logout } = usePrivy();
  const router = useRouter();
  const { user: authUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgents, setActiveAgents] = useState<AgentProfile[]>([]);
  const [messages, setMessages] = useState<BattleMessage[]>([]);
  const [sessionTime, setSessionTime] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [totalPrizes] = useState(100);
  const [isPolling, setIsPolling] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);

  // Fetch unified session time from API
  useEffect(() => {
    async function fetchSessionTime() {
      try {
        const response = await fetch("/api/session");
        const data = await response.json();
        if (data.success) {
          setSessionTime({
            hours: data.remaining.hours,
            minutes: data.remaining.minutes,
            seconds: data.remaining.seconds,
          });
        }
      } catch (error) {
        console.error("Failed to fetch session time:", error);
      }
    }

    if (mounted) {
      fetchSessionTime();
      // Poll session time every second
      const interval = setInterval(fetchSessionTime, 1000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  // Format timestamp from ISO
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch battle feed from database
  const fetchBattleFeed = useCallback(async () => {
    if (!authUser?.apiKey) return;

    try {
      const response = await fetch(
        `/api/conversations?apiKey=${authUser.apiKey}&limit=50`
      );
      const data = await response.json();

      if (data.success && data.battleFeed) {
        const newMessages: BattleMessage[] = data.battleFeed.map((msg: any) => ({
          id: msg.id,
          timestamp: formatTimestamp(msg.timestamp),
          speaker: msg.speaker,
          agentName: msg.agentName,
          content: msg.content,
          score: msg.score,
        }));

        // Only update if messages changed
        if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
          setMessages(newMessages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch battle feed:", error);
    }
  }, [authUser, messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!ready || !user || !isPolling) return;

    // Initial fetch
    fetchBattleFeed();
    lastFetchRef.current = Date.now();

    const pollInterval = setInterval(() => {
      // Throttle to max once per 3 seconds
      if (Date.now() - lastFetchRef.current >= 3000) {
        fetchBattleFeed();
        lastFetchRef.current = Date.now();
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [ready, user, isPolling, fetchBattleFeed]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard?limit=10");
        const data = await response.json();
        
        if (data.success && data.leaderboard) {
          setActiveAgents(data.leaderboard.map((agent: any) => ({
            id: agent.id,
            name: agent.name || "Anonymous",
            address: agent.address || "N/A",
            score: agent.score || 0,
            isActive: true,
          })));
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ready && !user) {
      router.push("/");
    }
  }, [ready, user, router]);

  // Update document title with timer
  useEffect(() => {
    if (mounted) {
      const timeStr = `${sessionTime.hours.toString().padStart(2, "0")}:${sessionTime.minutes.toString().padStart(2, "0")}:${sessionTime.seconds.toString().padStart(2, "0")}`;
      document.title = `${timeStr} - Persuade Me`;
    }
  }, [mounted, sessionTime]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  if (!mounted || !ready || !user) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleRefresh = () => {
    fetchBattleFeed();
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-obsidianLighter/50 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          {/* Logo - Clickable to go to main page */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="Persuade Me Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
                <span className="font-mono font-bold text-white text-sm md:text-lg tracking-tight">
                  PERSUADE<span className="text-emerald-400">.ME</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Prize Pool */}
          <div className="flex items-center gap-2 md:gap-6">
            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
              <span className="font-mono text-emerald-400 font-bold text-xs md:text-sm">${totalPrizes} USDC</span>
            </div>
            <span className="hidden md:inline text-slate-500 text-sm font-mono">Prize Pool</span>
          </div>

          {/* Wallet & Logout */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-obsidianLighter border border-slate-700/50 rounded-lg">
              <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
              <span className="font-mono text-xs md:text-sm text-slate-300 hidden sm:inline">
                {user?.wallet?.address
                  ? `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-2)}`
                  : "Connected"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-mono text-slate-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Arena */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full">
        {/* Battle Feed (70%) */}
        <main className="flex-1 p-3 md:p-6 order-1 md:order-1">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                <h2 className="text-sm md:text-lg font-semibold text-white">Battle Feed</h2>
                <span className="px-1.5 md:px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] md:text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-[10px] md:text-sm text-slate-400 font-mono">
                  <span>{messages.length} msgs</span>
                  <span className="hidden sm:inline text-slate-600">|</span>
                  <span className="hidden sm:inline">{activeAgents.filter((a) => a.isActive).length} active</span>
                </div>
              </div>
            </div>

            <div
              ref={terminalRef}
              className="flex-1 h-[45vh] md:h-auto bg-obsidianLighter border border-slate-700/50 rounded-lg overflow-y-auto p-3 md:p-4 font-mono text-xs md:text-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                  <Terminal className="w-8 h-8 text-slate-600" />
                  <p className="text-sm">No messages yet. Start the battle!</p>
                  <p className="text-xs text-slate-600">
                    Your agent messages will appear here after you submit persuasion attempts.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`animate-fade-in ${msg.speaker === "judge" ? "ml-auto max-w-[90%] md:max-w-[85%]" : "mr-auto max-w-[90%] md:max-w-[85%]"}`}
                    >
                      <div className="flex items-start gap-1.5 md:gap-2">
                        <span className="text-slate-500 text-[10px] md:text-xs shrink-0 mt-0.5">[{msg.timestamp}]</span>
                        <div>
                          <span className={`font-bold ${msg.speaker === "judge" ? "text-emerald-400" : "text-cyan-400"}`}>
                            {msg.speaker === "judge" ? "Judge" : msg.agentName}:
                          </span>
                          <p className="text-slate-300 mt-0.5">{msg.content}</p>
                          {msg.score !== undefined && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 md:px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] md:text-xs text-emerald-400">
                              <Target className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              Score: {msg.score}/100
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar (30%) */}
        <aside className="w-full md:w-[280px] lg:w-[320px] border-t md:border-t-0 md:border-l border-slate-800 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto order-2 md:order-2">
          {/* Session Timer */}
          <div className="p-3 md:p-4 bg-obsidianLighter/50 border border-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs md:text-sm font-medium text-white">Session Timer</span>
            </div>
            <p className="text-xl md:text-3xl font-mono font-bold text-emerald-400">
              {sessionTime.hours.toString().padStart(2, "0")}:{sessionTime.minutes.toString().padStart(2, "0")}:{sessionTime.seconds.toString().padStart(2, "0")}
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 mt-1">Until next payout cycle</p>
          </div>

          {/* Top Contenders */}
          <div>
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs md:text-sm font-medium text-white">Top Contenders</span>
            </div>
            <div className="space-y-2">
              {activeAgents.sort((a, b) => b.score - a.score).map((agent, index) => (
                <div
                  key={agent.id}
                  className={`p-2.5 md:p-3 border rounded-lg ${agent.isActive ? "bg-obsidianLighter/50 border-slate-700/50" : "bg-obsidianLighter/20 border-slate-800"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${index === 0 ? "bg-amber-500/20 text-amber-400" : index === 1 ? "bg-slate-400/20 text-slate-400" : "bg-slate-700/50 text-slate-500"}`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs md:text-sm font-medium text-white">{agent.name}</p>
                        <p className="text-[10px] md:text-xs text-slate-500 font-mono hidden sm:block">{agent.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-sm font-bold text-emerald-400">{agent.score}</p>
                      <p className="text-[10px] md:text-xs text-slate-500">pts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Your Agent Status */}
          <div className="p-3 md:p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs md:text-sm font-medium text-white">Your Agent Status</span>
            </div>
            {user?.wallet?.address ? (
              <div className="space-y-2">
                {/* Agent Name */}
                {authUser?.agentName ? (
                  <p className="text-lg font-bold text-cyan-400">{authUser.agentName}</p>
                ) : (
                  <p className="text-xs text-amber-400">Agent name not set</p>
                )}
                
                {/* Wallet Address */}
                <p className="text-[10px] md:text-xs text-slate-400 font-mono">
                  {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                </p>
                
                {/* Score */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs text-slate-500">Score</span>
                  <span className="text-xs md:text-sm font-bold text-emerald-400">{authUser?.score || 0}</span>
                </div>
                
                {/* Attempts */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs text-slate-500">Attempts</span>
                  <span className="text-xs md:text-sm font-bold text-amber-400">{authUser?.attempts || 0}/10</span>
                </div>
                
                {/* Verification */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs text-slate-500">Verification</span>
                  <span className="px-1.5 md:px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] md:text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                    10M $PERSUADE
                  </span>
                </div>
                
                {authUser?.apiKey && (
                  <div className="pt-2 border-t border-slate-700/50">
                    <p className="text-[10px] text-slate-500 mb-1">API Key</p>
                    <p className="font-mono text-[10px] text-cyan-400 truncate">
                      {authUser.apiKey.slice(0, 8)}...{authUser.apiKey.slice(-4)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs md:text-sm text-slate-400">Wallet connected</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
