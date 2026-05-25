import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/escrow", destination: "/deals", permanent: true },
      { source: "/portfolio", destination: "/deals", permanent: true },
      { source: "/otc", destination: "/deals", permanent: true },
    ];
  },
};

export default nextConfig;
