import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
