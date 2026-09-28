import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
