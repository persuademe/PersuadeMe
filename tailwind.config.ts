import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#050505",
        obsidianLight: "#0a0a0a",
        obsidianLighter: "#121212",
        emerald: "#10b981",
        crimson: "#ef4444",
        slate: {
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        glow: "glow 2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        "typewriter": "typewriter 0.5s steps(40, end)",
        "pulse-crimson": "pulse-crimson 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(16, 185, 129, 0.6)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        "pulse-crimson": {
          "0%, 100%": { 
            boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
            borderColor: "rgba(239, 68, 68, 0.5)"
          },
          "50%": { 
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.7)",
            borderColor: "rgba(239, 68, 68, 0.8)"
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(51, 65, 85, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(51, 65, 85, 0.15) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(circle at center, var(--tw-gradient-stops))",
        "gradient-mesh": "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 50%), linear-gradient(225deg, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
      },
      boxShadow: {
        'neon-emerald': '0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)',
        'neon-crimson': '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
