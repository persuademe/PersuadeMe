"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "solid" | "bordered";
  glassOpacity?: "low" | "medium" | "high";
}

export function Card({
  children,
  className,
  variant = "glass",
  glassOpacity = "medium",
  ...props
}: CardProps) {
  const variantStyles = {
    glass: cn(
      "bg-obsidianLighter/40 backdrop-blur-md border border-slate-700/40",
      "hover:border-slate-600/50 transition-all duration-300"
    ),
    solid: cn(
      "bg-obsidianLighter border border-slate-700/30",
      "hover:bg-obsidianLight hover:border-slate-600/50 transition-all duration-300"
    ),
    bordered: cn(
      "bg-transparent border border-slate-700/50",
      "hover:border-slate-600/70 hover:bg-obsidianLighter/20 transition-all duration-300"
    ),
  };

  return (
    <div
      className={cn(variantStyles[variant], "rounded-lg p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-white", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-400 font-mono", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-slate-700/30", className)} {...props}>
      {children}
    </div>
  );
}
