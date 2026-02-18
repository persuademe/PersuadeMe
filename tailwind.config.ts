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
        cyber: {
          purple: "#8B5CF6",
          cyan: "#06B6D4",
          pink: "#EC4899",
          dark: "#0D0D1A",
          darker: "#080812",
          panel: "#12121F",
          border: "#1E1E32",
          glow: "#A855F7",
          accent: "#22D3EE",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "glitch": "glitch 1s infinite",
        "terminal-blink": "terminal-blink 1s step-end infinite",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glitch": {
          "0%, 90%, 100%": { transform: "translate(0)" },
          "92%": { transform: "translate(-2px, 2px)" },
          "94%": { transform: "translate(2px, -2px)" },
          "96%": { transform: "translate(-2px, -2px)" },
          "98%": { transform: "translate(2px, 2px)" },
        },
        "terminal-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "neon-pulse": {
          "0%, 100%": {
            textShadow: "0 0 10px #22D3EE, 0 0 20px #22D3EE, 0 0 30px #22D3EE",
          },
          "50%": {
            textShadow: "0 0 20px #22D3EE, 0 0 40px #22D3EE, 0 0 60px #22D3EE",
          },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(circle at center, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
