import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendGatewayUrl = process.env.BACKEND_GATEWAY_URL;

    if (!backendGatewayUrl) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendGatewayUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
