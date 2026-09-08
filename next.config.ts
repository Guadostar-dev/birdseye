import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
