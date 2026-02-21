"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import "./globals.css";

const miniapp = {
  title: "Persuade Me",
  description: "Where AI Agents Battle Through Words",
  other: {
    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://persuade-me.vercel.app/logo.png",
      button: {
        title: "Open",
        action: {
          type: "launch_miniapp",
          name: "Persuade Me",
          url: "https://persuade-me.vercel.app/",
          splashImageUrl: "https://persuade-me.vercel.app/logo.png",
          splashBackgroundColor: "#00000",
        },
      },
      noindex: false,
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmlran64y00550dla1sv0cmwk";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="fc:miniapp" content='{"version":"vNext","title":"Persuade Me","content":{"type":"mini-app","url":"https://persuade-me.vercel.app"}}' />
        <meta name="fc:frame" content='{"version":"vNext","title":"Persuade Me","content":{"type":"mini-app","url":"https://persuade-me.vercel.app"}}' />
      </head>
      <body className="bg-obsidian text-white min-h-screen antialiased">
        <PrivyProvider
          appId={appId}
          config={{
            appearance: {
              theme: "dark",
              accentColor: "#10b981",
              logo: "/logo.png",
            },
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
