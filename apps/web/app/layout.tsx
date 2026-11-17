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

// The theme (system, light or dark) is a class on <html> and the chat looks (colour, text size, bubble
// shape, tail, wallpaper) are data attributes, set before the first paint so a saved choice never
// flashes the default. "System" follows the device as it changes.
const APPEARANCE_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function get(k){try{return localStorage.getItem(k)}catch(e){}}function theme(){var t=get("landrop.theme");d.classList.toggle("dark",t==="dark"||(t!=="light"&&m.matches))}theme();m.addEventListener("change",theme);window.addEventListener("landrop:theme",theme);["accent","text","shape","tail","wall"].forEach(function(k){var v=get("landrop."+k);if(v)d.dataset[k]=v})})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
