"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  LogOut,
  Wallet,
  User,
  Loader2,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useEffect, useState } from "react";

interface PrivyAuthProps {
  children?: React.ReactNode;
  variant?: "button" | "minimal" | "full";
}

export function PrivyAuth({ variant = "button", children }: PrivyAuthProps) {
  const { login, logout, user, ready, exportWallet } = usePrivy();
  const isLoginInProgress = false;
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, authState } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const isAuthenticated = ready && !!user;

  // Fetch or create user on login
  useEffect(() => {
    if (ready && isAuthenticated && user) {
      handleAuthenticate();
    }
  }, [ready, isAuthenticated, user]);

  // Fetch balances when popup opens
  useEffect(() => {
    if (showWalletPopup && user?.wallet?.address) {
      fetchBalances();
    }
  }, [showWalletPopup, user]);

  async function fetchBalances() {
    const walletAddress = user?.wallet?.address;
    if (!walletAddress || isLoadingBalances) return;

    setIsLoadingBalances(true);
    try {
      // Fetch $PERSUADE balance
      const persuadeResponse = await fetch(`/api/token-balance?wallet=${walletAddress}`);
      const persuadeData = await persuadeResponse.json();
      if (persuadeData.success) {
        setTokenBalance(persuadeData.balance);
      }

      // Fetch USDC balance (placeholder - would need actual API)
      setUsdcBalance("0.00");
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  }

  async function handleAuthenticate() {
    // Prevent multiple simultaneous calls
    if (isLoading) return;
    
    console.log("Full Privy user object:", JSON.stringify(user, null, 2));
    
    // Try different wallet sources from Privy
    const wallet = user!.wallet;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const embeddedWallets = (user as any)?.embeddedWallets;
    const walletAddress = wallet?.address || 
                         (embeddedWallets?.[0]?.address) || 
                         "pending";
    const email = user!.email?.address || "";

    console.log("Wallet sources:", { 
      direct: wallet?.address, 
      embedded: embeddedWallets?.[0]?.address,
      finalAddress: walletAddress !== "pending" ? walletAddress : "pending"
    });

    if (!email) {
      console.error("No email found in Privy user");
      return;
    }

    console.log("Authenticating user:", { email, walletAddress: walletAddress !== "pending" ? walletAddress : "pending" });

    // Call API even if wallet is not available yet - will create pending user
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress, 
          email 
        }),
      });

      const data = await response.json();

      console.log("Auth API response:", data);

      if (data.success) {
        storeLogin({
          id: data.user.id,
          email: data.user.email,
          walletAddress: data.user.walletAddress,
          agentName: data.user.agentName,
          apiKey: data.user.apiKey,
          score: data.user.score || 0,
          attempts: data.user.attempts || 0,
          isVerified: true,
        });

        if (data.isNewUser) {
          console.log("✅ New user created with API key:", data.user.apiKey);
        } else {
          console.log("✅ Existing user logged in");
        }
      } else {
        console.error("❌ Auth failed:", data.error);
      }
    } catch (error) {
      console.error("❌ Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const copyAddress = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    storeLogout();
    setShowWalletPopup(false);
  };

  useEffect(() => {
    if (ready && !isAuthenticated && authState !== "disconnected") {
      storeLogout();
    }
  }, [ready, isAuthenticated, authState, storeLogout]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-cyber-cyan" />
      </div>
    );
  }

  switch (variant) {
    case "minimal":
      return isAuthenticated ? (
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-cyber-cyan hover:text-cyber-purple transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-mono">Disconnect</span>
        </button>
      ) : (
        <button
          onClick={login}
          className="flex items-center gap-2 text-cyber-purple hover:text-cyber-cyan transition-colors"
        >
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-mono">Connect</span>
        </button>
      );

    case "full":
      return (
        <div className="flex flex-col gap-4">
          {isAuthenticated && user ? (
            <div className="space-y-4">
              {/* User Info Card */}
              <div className="bg-cyber-panel border border-cyber-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyber-purple/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-cyber-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 font-mono">Email</p>
                    <p className="text-white truncate">
                      {user.email?.address || "Anonymous"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-cyber-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 font-mono">Wallet</p>
                    <p className="text-white font-mono truncate">
                      {user.wallet?.address
                        ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
                        : "Not connected"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-mono">Disconnect</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-cyber-panel border border-cyber-border rounded-lg p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyber-purple/20 flex items-center justify-center">
                  <Terminal className="w-8 h-8 text-cyber-purple" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Connect to Enter
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Link your wallet to access the Persuasion Arena
                  </p>
                </div>
              </div>
              <button
                onClick={login}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyber-purple/20 border border-cyber-purple/50 rounded-lg text-cyber-purple hover:bg-cyber-purple/30 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span className="font-mono">
                  {isLoading ? "Connecting..." : "Connect Agent"}
                </span>
              </button>
            </div>
          )}
        </div>
      );

    case "button":
    default:
      return isAuthenticated ? (
        <div className="flex items-center gap-4 relative">
          {user?.wallet?.address && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-cyber-panel border border-cyber-border rounded-lg">
              <Wallet className="w-4 h-4 text-cyber-cyan" />
              <button
                onClick={() => setShowWalletPopup(!showWalletPopup)}
                className="font-mono text-sm text-gray-300 hover:text-white transition-colors"
              >
                {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
              </button>
            </div>
          )}
          
          {/* Wallet Info Popup */}
          {showWalletPopup && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-obsidianLight border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-mono">Wallet Address</span>
                  <button
                    onClick={copyAddress}
                    className="p-1 text-slate-500 hover:text-white transition-colors"
                  >
                    {copiedAddress ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs text-cyan-400 break-all">
                  {user?.wallet?.address}
                </p>
              </div>
              
              <div className="p-4 border-b border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs">🔷</span>
                    </div>
                    <span className="text-xs text-slate-400">USDC</span>
                  </div>
                  <span className="font-mono text-xs text-emerald-400">
                    {isLoadingBalances ? "..." : `${Number(usdcBalance || 0).toLocaleString()}`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-xs">◈</span>
                    </div>
                    <span className="text-xs text-slate-400">$PERSUADE</span>
                  </div>
                  <span className="font-mono text-xs text-cyan-400">
                    {isLoadingBalances ? "..." : `${Number(tokenBalance || 0).toLocaleString()}`}
                  </span>
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                <button
                  onClick={() => {
                    if (user?.wallet?.address) {
                      exportWallet({ address: user.wallet.address });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors text-xs"
                >
                  <Key className="w-3 h-3" />
                  <span className="font-mono">Export Private Key</span>
                </button>
                
                <button
                  onClick={() => {
                    logout();
                    storeLogout();
                    setShowWalletPopup(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors text-xs"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="font-mono">Disconnect</span>
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              setShowWalletPopup(false);
              router.push("/dashboard");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/20 border border-cyber-cyan/50 rounded-lg text-cyber-cyan hover:bg-cyber-cyan/30 transition-all"
          >
            <Terminal className="w-4 h-4" />
            <span className="font-mono">Dashboard</span>
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs md:text-sm font-mono disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
          )}
          <span>{isLoading ? "..." : "Connect"}</span>
        </button>
      );
  }
}

// Compact button for navbar
export function ConnectButton() {
  const { login, logout, user, ready } =
    usePrivy();
  const isLoginInProgress = false;
  const router = useRouter();
  const isAuthenticated = ready && !!user;

  if (!ready) {
    return (
      <div className="w-8 h-8 rounded-full border-2 border-cyber-border border-t-cyber-purple animate-spin" />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyber-panel border border-cyber-border rounded-md">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-xs text-gray-300">
            {user?.wallet?.address?.slice(0, 4)}...
            {user?.wallet?.address?.slice(-2)}
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-3 py-1.5 bg-cyber-cyan/20 border border-cyber-cyan/50 rounded-md text-cyber-cyan text-sm font-mono hover:bg-cyber-cyan/30 transition-all"
        >
          Dashboard
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      disabled={isLoginInProgress}
      className="px-4 py-2 bg-cyber-purple/20 border border-cyber-purple/50 rounded-md text-cyber-purple text-sm font-mono hover:bg-cyber-purple/30 transition-all disabled:opacity-50"
    >
      {isLoginInProgress ? "..." : "Connect"}
    </button>
  );
}

// HOC wrapper for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requireAuth = true
) {
  return function AuthenticatedComponent(props: P) {
    const { user, ready } = usePrivy();
    const router = useRouter();
    const isAuthenticated = ready && !!user;

    useEffect(() => {
      if (ready && requireAuth && !isAuthenticated) {
        router.push("/");
      }
    }, [ready, isAuthenticated, router]);

    if (!ready) {
      return (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (requireAuth && !isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}
