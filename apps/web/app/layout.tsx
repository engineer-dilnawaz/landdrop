import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LANDrop",
  description: "Share text and files between devices on your local network.",
};

// LANDrop has its own light and dark themes. Declaring both stops browsers with a forced dark
// mode (Samsung Internet, Chrome's auto-dark) from darkening the dark theme a second time.
export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
