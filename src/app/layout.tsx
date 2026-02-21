"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import "./globals.css";
import { sdk, SdkProvider } from "@farcaster/miniapp-sdk";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmlran64y00550dla1sv0cmwk";

  useEffect(() => {
    setMounted(true);
    
    // Initialize mini-app when loaded
    const initMiniApp = async () => {
      try {
        await sdk.actions.ready();
        console.log('[MiniApp] Ready');
      } catch (e) {
        // Not in mini-app context
      }
    };
    
    if (mounted) {
      initMiniApp();
    }
  }, [mounted]);

  return (
    <SdkProvider>
      <html lang="en" className="dark">
        <head>
          <link rel="icon" type="image/png" href="/logo.png" />
          <link rel="apple-touch-icon" href="/logo.png" />
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
        </SdkProvider>
      </body>
    </html>
  );
}
