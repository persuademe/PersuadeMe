"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Wallet, Copy, Check, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletCardProps {
  address?: string;
  persuadeBalance?: string;
  usdcBalance?: string;
  isVerified?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function WalletCard({
  address,
  persuadeBalance = "0",
  usdcBalance = "0",
  isVerified = false,
  isLoading = false,
  className,
}: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    if (!addr) return "Not connected";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBalance = (balance: string) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(balance.replace(/,/g, "")));
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="bg-obsidianLighter/40 backdrop-blur-md border border-slate-700/40 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700/30 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-slate-700/30 rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-slate-700/30 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-8 w-40 bg-slate-700/30 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-700/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Wallet Card */}
      <div className="bg-obsidianLighter/40 backdrop-blur-md border border-slate-700/40 rounded-lg p-6 hover:border-slate-600/50 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-mono mb-0.5">
                Wallet Address
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-mono">
                  {truncateAddress(address || "")}
                </p>
                <button
                  onClick={handleCopy}
                  className="p-1 text-slate-500 hover:text-white transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono",
              isVerified
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-crimson-500/10 border-crimson-500/30 text-crimson-400"
            )}
          >
            {isVerified ? (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Authorized</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Restricted</span>
              </>
            )}
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-obsidianLight/50 rounded-lg p-4 border border-slate-700/30">
            <p className="text-xs text-slate-500 font-mono mb-1">
              $PERSUADE Balance
            </p>
            <p className="text-2xl font-bold text-white font-mono">
              {formatBalance(persuadeBalance)}
            </p>
          </div>
          <div className="bg-obsidianLight/50 rounded-lg p-4 border border-slate-700/30">
            <p className="text-xs text-slate-500 font-mono mb-1">USDC Balance</p>
            <p className="text-2xl font-bold text-white font-mono">
              ${formatBalance(usdcBalance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
