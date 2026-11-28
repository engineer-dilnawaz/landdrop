import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Lets a phone install LANDrop to its home screen and open it like an app, without the browser's bars. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LANDrop",
    short_name: "LANDrop",
    description: "Share text and files between devices on your local network.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#04855d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
