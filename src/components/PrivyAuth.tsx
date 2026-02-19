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
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useEffect, useState } from "react";

interface PrivyAuthProps {
  children?: React.ReactNode;
  variant?: "button" | "minimal" | "full";
}

export function PrivyAuth({ variant = "button", children }: PrivyAuthProps) {
  const { login, logout, user, ready } =
    usePrivy();
  const isLoginInProgress = false; // Privy handles this internally
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, authState } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = ready && !!user;

  // Fetch or create user on login
  useEffect(() => {
    if (ready && isAuthenticated && user) {
      handleAuthenticate();
    }
  }, [ready, isAuthenticated, user]);

  async function handleAuthenticate() {
    const wallet = user!.wallet;
    const walletAddress = wallet?.address || "";
    const email = user!.email?.address || "";

    if (!email) {
      console.error("No email found");
      return;
    }

    // Call API even if wallet is not available yet - will create pending user
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress: walletAddress || "pending", 
          email 
        }),
      });

      const data = await response.json();

      if (data.success) {
        storeLogin({
          id: data.user.id,
          email: data.user.email,
          walletAddress: data.user.walletAddress,
          apiKey: data.user.apiKey,
          isVerified: true,
        });

        if (data.isNewUser) {
          console.log("New user created with API key:", data.user.apiKey);
        } else {
          console.log("Existing user logged in");
        }
      } else {
        console.error("Auth failed:", data.error);
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  }

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
          onClick={() => {
            logout();
            storeLogout();
            router.push("/");
          }}
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
                onClick={() => {
                  logout();
                  storeLogout();
                  router.push("/");
                }}
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
        <div className="flex items-center gap-4">
          {user?.wallet?.address && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-cyber-panel border border-cyber-border rounded-lg">
              <Wallet className="w-4 h-4 text-cyber-cyan" />
              <span className="font-mono text-sm text-gray-300">
                {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
              </span>
            </div>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-cyan/20 border border-cyber-cyan/50 rounded-lg text-cyber-cyan hover:bg-cyber-cyan/30 transition-all"
          >
            <Terminal className="w-4 h-4" />
            <span className="font-mono">Dashboard</span>
          </button>
          <button
            onClick={() => {
              logout();
              storeLogout();
            }}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Disconnect"
          >
            <LogOut className="w-5 h-5" />
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
