"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Key, Copy, Check, RefreshCw, Eye, EyeOff, Cpu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";

interface AccessKeyProps {
  initialKey?: string;
  onGenerate?: () => string;
  className?: string;
  autoFetch?: boolean;
}

export function AccessKey({
  initialKey,
  onGenerate,
  className,
  autoFetch = true,
}: AccessKeyProps) {
  const { user, isLoading: authLoading } = useAuthStore();
  const [accessKey, setAccessKey] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch API key from database if user is authenticated
  useEffect(() => {
    if (autoFetch && user?.apiKey) {
      setAccessKey(user.apiKey);
    } else if (autoFetch && user?.walletAddress && !initialKey) {
      fetchApiKey();
    } else if (initialKey) {
      setAccessKey(initialKey);
    }
  }, [user, initialKey, autoFetch]);

  async function fetchApiKey() {
    if (!user?.walletAddress) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/auth?walletAddress=${encodeURIComponent(user.walletAddress)}`
      );
      const data = await response.json();

      if (data.success && data.user?.apiKey) {
        setAccessKey(data.user.apiKey);
        // Update store with fetched API key
        useAuthStore.getState().login({
          ...user,
          apiKey: data.user.apiKey,
        });
      }
    } catch (error) {
      console.error("Failed to fetch API key:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function generateKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 24; i++) {
      if (i > 0 && i % 8 === 0) result += "-";
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleGenerate = () => {
    const newKey = onGenerate ? onGenerate() : generateKey();
    setAccessKey(newKey);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(accessKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = isVisible
    ? accessKey
    : accessKey.replace(/./g, "•").replace(/-/g, "•");

  if (authLoading || isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
          <Key className="w-4 h-4" />
          <span>Access Key</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
        <Key className="w-4 h-4" />
        <span>Access Key</span>
      </div>

      <div className="relative">
        <div
          className={cn(
            "bg-obsidianLight/50 border border-slate-700/50 rounded-lg px-4 py-3",
            "font-mono text-sm break-all transition-all duration-300",
            "focus-within:border-slate-600/70 focus-within:bg-obsidianLighter/50"
          )}
        >
          {maskedKey || (
            <span className="text-slate-500 italic">
              No API key available. Connect your wallet to get started.
            </span>
          )}
        </div>

        {accessKey && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="p-1.5 text-slate-500 hover:text-white transition-colors rounded"
              title={isVisible ? "Hide key" : "Show key"}
            >
              {isVisible ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                "p-1.5 rounded transition-colors",
                copied
                  ? "text-emerald-400"
                  : "text-slate-500 hover:text-white"
              )}
              title="Copy key"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {accessKey && (
        <Button
          variant="neon"
          size="sm"
          onClick={handleGenerate}
          className="w-full"
        >
          <Cpu className="w-4 h-4" />
          <span>Generate New Key</span>
          <RefreshCw className="w-3.5 h-3.5 ml-auto" />
        </Button>
      )}

      {!accessKey && (
        <div className="text-xs text-slate-500">
          Connect your wallet to generate an API key
        </div>
      )}
    </div>
  );
}
