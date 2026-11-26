import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "LANDrop: share anything across your Wi-Fi",
  description: "Chat and share files of any size with every phone and computer on your Wi-Fi. No cloud, no accounts, nothing to install on phones.",
  openGraph: {
    title: "LANDrop",
    description: "Chat and share files of any size with every device on your Wi-Fi. Nothing leaves your network.",
  },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { colorScheme: "light dark" };

// ShadCN's dark theme is a `.dark` class; follow the device's light or dark setting before first paint.
const THEME_SCRIPT = `(function(){var m=matchMedia("(prefers-color-scheme: dark)"),d=document.documentElement;function s(){d.classList.toggle("dark",m.matches)}s();m.addEventListener("change",s)})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen overflow-x-hidden antialiased">{children}</body>
    </html>
  );
}
