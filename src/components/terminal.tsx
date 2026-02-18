"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Terminal, Cpu, Activity } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: "success" | "pending" | "error";
  details?: string;
}

interface TerminalProps {
  logs?: LogEntry[];
  className?: string;
  autoScroll?: boolean;
  showHeader?: boolean;
  emptyMessage?: string;
}

export function Terminal({
  logs = [],
  className,
  autoScroll = true,
  showHeader = true,
  emptyMessage = "Waiting for Agents...",
}: TerminalProps) {
  const [displayedLogs, setDisplayedLogs] = useState<LogEntry[]>(logs);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    setDisplayedLogs(logs);
  }, [logs]);

  useEffect(() => {
    if (autoScroll && isAtBottom && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayedLogs, autoScroll, isAtBottom]);

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(isAtBottomNow);
    }
  };

  const getStatusStyles = (status: LogEntry["status"]) => {
    switch (status) {
      case "success":
        return "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
      case "error":
        return "text-crimson-400 bg-crimson-500/5 border-crimson-500/10";
      case "pending":
        return "text-yellow-400 bg-yellow-500/5 border-yellow-500/10";
      default:
        return "text-slate-400 bg-slate-500/5 border-slate-500/10";
    }
  };

  const TypewriterText = ({ text }: { text: string }) => {
    const [displayed, setDisplayed] = useState("");

    useEffect(() => {
      setDisplayed("");
      let index = 0;
      const timer = setInterval(() => {
        if (index < text.length) {
          setDisplayed(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 30);
      return () => clearInterval(timer);
    }, [text]);

    return <span>{displayed}</span>;
  };

  return (
    <div
      className={cn(
        "bg-obsidianLighter border border-slate-700/50 rounded-lg overflow-hidden",
        "scan-line-overlay",
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-obsidianLight/50 border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span className="font-mono text-sm text-slate-300">
                Judge Terminal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 font-mono">LIVE</span>
          </div>
        </div>
      )}

      <div
        ref={terminalRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-auto p-4 space-y-2 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {displayedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Cpu className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm animate-pulse">{emptyMessage}</span>
          </div>
        ) : (
          displayedLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300 animate-fade-in",
                getStatusStyles(log.status)
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-slate-500 text-xs min-w-[70px]">
                {log.timestamp}
              </span>
              <span className="font-bold min-w-[80px]">
                [{log.agent}]
              </span>
              <span className="text-slate-300">{log.action}</span>
              {log.details && (
                <span className="text-slate-500 text-xs">
                  → <TypewriterText text={log.details} />
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx global>{`
        .scan-line-overlay {
          position: relative;
        }
        .scan-line-overlay::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(16, 185, 129, 0.3),
            transparent
          );
          animation: scan-line 3s linear infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
