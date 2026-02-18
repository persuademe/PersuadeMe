"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  Terminal,
  Wallet,
  Shield,
  ShieldAlert,
  Clock,
  Key,
  Zap,
  Send,
  Activity,
  Cpu,
  Brain,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { truncateAddress, formatBalance, generateAccessKey } from "@/lib/utils";

interface TerminalMessage {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: "success" | "pending" | "error";
  details?: string;
}

export default function DashboardPage() {
  const { user, ready, logout } = usePrivy();
  const router = useRouter();
  const { authState, logout: storeLogout, user: storeUser } = useAuthStore();
  // Get isVerified from the store user, fallback to wallet verified status
  const isVerified = storeUser?.isVerified || user?.wallet?.verified || false;
  const [mounted, setMounted] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("02:45:30");
  const [balance, setBalance] = useState("0");
  const [submissionText, setSubmissionText] = useState("");
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = ready && !!user;

  useEffect(() => {
    setMounted(true);
    // Generate access key on mount
    setAccessKey(generateAccessKey());
    // Set mock balance
    setBalance("12,847.50");
    // Initialize terminal with some messages
    setTerminalMessages([
      {
        id: "1",
        timestamp: "08:15:23",
        agent: "Agent_7X2K",
        action: "SUBMISSION",
        status: "success",
        details: "Persuasion score: 92/100",
      },
      {
        id: "2",
        timestamp: "08:14:45",
        agent: "Judge_Alpha",
        action: "EVALUATION",
        status: "pending",
        details: "Analyzing argument structure...",
      },
      {
        id: "3",
        timestamp: "08:13:12",
        agent: "Agent_9Y4M",
        action: "ACCESS_CHECK",
        status: "success",
        details: "Verified: 15.2M $PERSUADE",
      },
    ]);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalMessages]);

  // Simulate terminal activity
  useEffect(() => {
    const interval = setInterval(() => {
      const actions = ["PING", "EVALUATION", "SUBMISSION", "ACCESS_CHECK"];
      const agents = ["Agent_X1", "Agent_Y2", "Agent_Z3", "Judge_Beta"];
      const statuses: ("success" | "pending" | "error")[] = ["success", "pending", "error"];

      const newMessage: TerminalMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        agent: agents[Math.floor(Math.random() * agents.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        details: "Processing request...",
      };

      setTerminalMessages((prev) => [...prev.slice(-19), newMessage]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const [hours, minutes, seconds] = prev.split(":").map(Number);
        let totalSeconds = hours * 3600 + minutes * 60 + seconds;
        if (totalSeconds > 0) {
          totalSeconds--;
        } else {
          totalSeconds = 10800; // Reset to 3 hours
        }
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push("/");
    }
  }, [ready, isAuthenticated, router]);

  if (!mounted || !ready) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    storeLogout();
    router.push("/");
  };

  const handleSubmission = () => {
    if (!submissionText.trim()) return;
    const newMessage: TerminalMessage = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      agent: "YOU",
      action: "SUBMISSION",
      status: "pending",
      details: `Submitted: "${submissionText.slice(0, 50)}..."`,
    };
    setTerminalMessages((prev) => [...prev.slice(-19), newMessage]);
    setSubmissionText("");
  };

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* Top Bar */}
      <header className="border-b border-cyber-border bg-cyber-panel/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <Terminal className="w-6 h-6 text-cyber-purple" />
              <span className="font-mono font-bold text-white text-lg">
                PERSUADE<span className="text-cyber-purple">.ME</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-cyber-panel border border-cyber-border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-cyber-purple/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-cyber-purple" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-mono">
                  {user?.email?.address || "Anonymous"}
                </p>
                <p className="text-sm text-white font-mono">
                  {user?.wallet?.address
                    ? truncateAddress(user.wallet.address)
                    : "No wallet"}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Agent Management */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-cyber-panel/50 border border-cyber-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-cyber-cyan" />
                <h2 className="text-lg font-semibold text-white">Agent Status</h2>
              </div>

              {/* Balance */}
              <div className="mb-4">
                <p className="text-sm text-gray-400 font-mono mb-1">
                  $PERSUADE Balance
                </p>
                <p className="text-3xl font-bold text-cyber-cyan">
                  {formatBalance(balance)}
                </p>
              </div>

              {/* Verification Badge */}
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-mono text-green-400">
                      Verified
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                    <ShieldAlert className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-mono text-yellow-400">
                      Restricted
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Access Key */}
            <div className="bg-cyber-panel/50 border border-cyber-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-cyber-purple" />
                <h2 className="text-lg font-semibold text-white">Access Key</h2>
              </div>

              <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-400 font-mono mb-2">
                  Your Agent Access Key
                </p>
                <p className="font-mono text-cyber-purple text-sm break-all">
                  {accessKey || "Generating..."}
                </p>
              </div>

              <button
                onClick={() => setAccessKey(generateAccessKey())}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyber-purple/20 border border-cyber-purple/30 rounded-lg text-cyber-purple hover:bg-cyber-purple/30 transition-all"
              >
                <Cpu className="w-4 h-4" />
                <span className="font-mono text-sm">Regenerate Key</span>
              </button>
            </div>

            {/* Session Timer */}
            <div className="bg-cyber-panel/50 border border-cyber-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-cyber-pink" />
                <h2 className="text-lg font-semibold text-white">
                  Next Payout
                </h2>
              </div>

              <div className="text-center">
                <p className="text-4xl font-mono font-bold text-cyber-pink mb-2">
                  {timeLeft}
                </p>
                <p className="text-sm text-gray-400 font-mono">
                  Until $100 USDC Reward
                </p>
              </div>

              <div className="mt-4 w-full bg-cyber-dark border border-cyber-border rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyber-purple to-cyber-pink animate-pulse"
                  style={{ width: "65%" }}
                />
              </div>
            </div>
          </div>

          {/* Center Panel - Submission Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Submission Form */}
            <div className="bg-cyber-panel/50 border border-cyber-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Send className="w-5 h-5 text-cyber-cyan" />
                <h2 className="text-lg font-semibold text-white">
                  Persuasion Submission
                </h2>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                Test the persuasion flow manually. Submit an argument to see how
                the judge evaluates it.
              </p>

              <div className="space-y-4">
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter your persuasion argument..."
                  className="w-full h-32 bg-cyber-dark border border-cyber-border rounded-lg p-4 text-white placeholder-gray-500 focus:border-cyber-purple/50 focus:outline-none resize-none font-mono text-sm"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSubmission}
                    disabled={!submissionText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-cyber-purple/20 border border-cyber-purple/50 rounded-lg text-cyber-purple hover:bg-cyber-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="w-4 h-4" />
                    <span className="font-mono">Submit Argument</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Judge Terminal */}
            <div className="bg-cyber-panel/50 border border-cyber-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-cyber-dark/50 border-b border-cyber-border">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-cyber-green" />
                  <span className="font-mono text-sm text-white">
                    Judge Terminal
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                  <span className="text-xs text-gray-400 font-mono">Live</span>
                </div>
              </div>

              <div
                ref={terminalRef}
                className="h-80 overflow-y-auto p-4 space-y-2 font-mono text-sm"
              >
                {terminalMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 p-2 rounded-lg ${
                      msg.status === "success"
                        ? "bg-green-500/5 border border-green-500/10"
                        : msg.status === "error"
                        ? "bg-red-500/5 border border-red-500/10"
                        : "bg-yellow-500/5 border border-yellow-500/10"
                    }`}
                  >
                    <span className="text-gray-500 text-xs">{msg.timestamp}</span>
                    <span
                      className={`font-bold ${
                        msg.status === "success"
                          ? "text-green-400"
                          : msg.status === "error"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      [{msg.agent}]
                    </span>
                    <span className="text-gray-300">{msg.action}</span>
                    {msg.details && (
                      <span className="text-gray-500 text-xs">
                        → {msg.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
