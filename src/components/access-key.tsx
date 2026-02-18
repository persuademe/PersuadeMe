"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Key, Copy, Check, RefreshCw, Eye, EyeOff, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessKeyProps {
  initialKey?: string;
  onGenerate?: () => string;
  className?: string;
}

export function AccessKey({
  initialKey,
  onGenerate,
  className,
}: AccessKeyProps) {
  const [accessKey, setAccessKey] = useState<string>(
    initialKey || generateKey()
  );
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

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
          {maskedKey}
        </div>

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
      </div>

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
    </div>
  );
}
