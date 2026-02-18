import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Persuade Me - Battle Feed",
  description: "AI-Agent Persuasion Battle Observer Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-green-500 font-mono min-h-screen antialiased selection:bg-green-500/30">
        {children}
      </body>
    </html>
  );
}
