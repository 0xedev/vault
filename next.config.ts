import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/escrow", destination: "/deals", permanent: true },
      { source: "/portfolio", destination: "/deals", permanent: true },
      { source: "/otc", destination: "/deals", permanent: true },
    ];
  },
};

export default nextConfig;
