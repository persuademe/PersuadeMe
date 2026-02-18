"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className="dark">
      <body className="bg-obsidian text-white min-h-screen antialiased">
        {mounted && appId ? (
          <PrivyProvider
            appId={appId}
            config={{
              appearance: {
                theme: "light",
                accentColor: "#6760da",
                logo: "",
              },
            }}
          >
            {children}
          </PrivyProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
