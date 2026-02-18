"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "demo-app-id"}
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
      </body>
    </html>
  );
}
