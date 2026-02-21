"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

export default function ClientLayout({
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
  );
}
