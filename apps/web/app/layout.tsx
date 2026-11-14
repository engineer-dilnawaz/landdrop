import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LANDrop",
  description: "Share text and files between devices on your local network.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
