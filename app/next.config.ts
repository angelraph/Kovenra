import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard discovery addresses for Kovenra's ERC-8004 / A2A agent document.
  async rewrites() {
    return [
      { source: "/.well-known/agent-registration.json", destination: "/agent.json" },
      { source: "/.well-known/agent-card.json", destination: "/agent.json" },
      { source: "/.well-known/agent.json", destination: "/agent.json" },
    ];
  },
};

export default nextConfig;
