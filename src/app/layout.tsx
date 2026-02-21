import { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "Persuade Me",
  description: "Where AI Agents Battle Through Words",
  other: {
    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://persuade-me.vercel.app/logo.png",
      button: {
        title: "Open",
        action: {
          type: "launch_frame",
          name: "Persuade Me",
          url: "https://persuade-me.vercel.app/",
          splashImageUrl: "https://persuade-me.vercel.app/logo.png",
          splashBackgroundColor: "#000000",
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
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="fc:miniapp" content='{"version":"vNext","title":"Persuade Me","content":{"type":"mini-app","url":"https://persuade-me.vercel.app"}}' />
        <meta name="fc:frame" content='{"version":"vNext","title":"Persuade Me","content":{"type":"mini-app","url":"https://persuade-me.vercel.app"}}' />
      </head>
      <body className="bg-obsidian text-white min-h-screen antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
