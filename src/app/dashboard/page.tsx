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
  Home,
  BookOpen,
  Trophy,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WalletCard } from "@/components/wallet-card";
import { AccessKey } from "@/components/access-key";
import { Terminal as TerminalComponent } from "@/components/terminal";

interface TerminalMessage {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: "success" | "pending" | "error";
  details?: string;
}

const navItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Wallet, label: "Wallet", href: "#" },
  { icon: Brain, label: "Agent", href: "#" },
  { icon: BookOpen, label: "API Docs", href: "#" },
  { icon: Trophy, label: "Hall of Fame", href: "#" },
];

export default function DashboardPage() {
  const { user, ready, logout } = usePrivy();
  const router = useRouter();
  const { authState, logout: storeLogout, user: storeUser } = useAuthStore();
  const isVerified = storeUser?.isVerified || false;
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState("02:45:30");
  const [balance, setBalance] = useState("12,847.50");
  const [submissionText, setSubmissionText] = useState("");
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>(
    []
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = ready && !!user;

  // Generate initial access key
  const generateAccessKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 24; i++) {
      if (i > 0 && i % 8 === 0) result += "-";
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [accessKey] = useState(generateAccessKey());

  useEffect(() => {
    setMounted(true);

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
      const statuses: ("success" | "pending" | "error")[] = [
        "success",
        "pending",
        "error",
      ];

      const newMessage: TerminalMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        agent: agents[Math.floor(Math.random() * agents.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        details: "Processing request...",
      };

      setTerminalMessages((prev) => [...prev.slice(-49), newMessage]);
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
        return `${h.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
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
    setTerminalMessages((prev) => [...prev.slice(-49), newMessage]);
    setSubmissionText("");
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-obsidianLighter border border-slate-700 rounded-lg text-white"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-64 bg-obsidianLight/95 border-r border-slate-700/30 z-40",
          "transform transition-transform duration-300 lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div
            className="flex items-center gap-2 mb-8 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-9 h-9 rounded-lg bg-obsidianLighter border border-slate-700/50 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-mono font-bold text-white text-lg">
              PERSUADE<span className="text-emerald-400">.ME</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "text-sm font-mono",
                  item.label === "Dashboard"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-obsidianLighter/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User Info */}
          <div className="pt-4 border-t border-slate-700/30">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-mono truncate">
                  {user?.email?.address || "Anonymous"}
                </p>
                <p className="text-sm text-white font-mono truncate">
                  {user?.wallet?.address
                    ? truncateAddress(user.wallet.address)
                    : "No wallet"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-crimson-400 hover:bg-crimson-500/5 rounded-lg transition-colors text-sm font-mono"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-0 min-h-screen">
        {/* Main Grid */}
        <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Center: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Card */}
            <WalletCard
              address={user?.wallet?.address}
              persuadeBalance={balance}
              usdcBalance="847.50"
              isVerified={isVerified}
            />

            {/* Countdown Timer Card */}
            <Card variant="glass" glassOpacity="medium">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-crimson-500/10 border border-crimson-500/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-crimson-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Next Payout</p>
                    <p className="text-xs text-slate-400 font-mono">
                      $100 USDC Reward
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-mono font-bold text-crimson-400">
                    {timeLeft}
                  </p>
                </div>
              </div>
              <div className="w-full bg-obsidianLight border border-slate-700/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
                  style={{ width: "65%" }}
                />
              </div>
            </Card>

            {/* Access Key Module */}
            <Card variant="glass" glassOpacity="medium">
              <AccessKey initialKey={accessKey} />
            </Card>

            {/* Submission Form */}
            <Card variant="glass" glassOpacity="medium">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Send className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">
                    Persuasion Submission
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    Test the persuasion flow manually
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter your persuasion argument..."
                  className="w-full h-32 bg-obsidianLight/50 border border-slate-700/30 rounded-lg p-4 text-white placeholder-slate-500 focus:border-slate-600/50 focus:outline-none resize-none font-mono text-sm transition-all"
                />

                <div className="flex justify-end">
                  <Button
                    variant="neon"
                    onClick={handleSubmission}
                    disabled={!submissionText.trim()}
                    glowColor="emerald"
                  >
                    <Brain className="w-4 h-4" />
                    <span>Submit Argument</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Judge Terminal */}
            <TerminalComponent
              logs={terminalMessages}
              emptyMessage="Waiting for Agents..."
              className="border-slate-700/50"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
