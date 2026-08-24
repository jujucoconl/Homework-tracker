import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Homework Tracker",
  description: "Track homework, repeating assignments, and get reminded before it's due.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-slate-100 antialiased">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
