import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app runs entirely in the browser, so it builds to plain files the LAN server hands out:
  // one program, one port, nothing else to run on the host.
  output: "export",
  experimental: {
    agentFeedback: true,
  },
  transpilePackages: ["@landrop/protocol"],
  // Other devices open the dev server by its LAN IP; allow private-network hostnames.
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*", "*.local"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
