"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "neon" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  glowColor?: "emerald" | "crimson" | "purple";
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = "default",
  size = "md",
  glowColor = "emerald",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2 font-mono font-medium
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-obsidian
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantStyles = {
    default: `
      bg-obsidianLighter text-white border border-slate-700/50
      hover:bg-obsidianLight hover:border-slate-600/50 hover:scale-105
      active:scale-95
    `,
    neon: `
      bg-transparent text-emerald-400 border border-emerald-500/50
      hover:text-emerald-300 hover:border-emerald-400/70
      hover:scale-105 hover:shadow-neon-emerald
      active:scale-95
      ${glowColor === "crimson" ? "hover:shadow-neon-crimson text-crimson-400 hover:border-crimson-400/70 hover:text-crimson-300" : ""}
    `,
    ghost: `
      text-slate-400 hover:text-white hover:bg-obsidianLighter/50
      active:scale-95
    `,
    outline: `
      bg-transparent text-white border border-slate-700/50
      hover:border-slate-600/70 hover:bg-obsidianLighter/30
      hover:scale-105 active:scale-95
    `,
  };

  const glowAnimation = variant === "neon" && !disabled ? `animate-glow` : "";

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], glowAnimation, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
