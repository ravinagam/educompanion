import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '52mb',
    },
  },
  serverExternalPackages: ['pdf-parse', 'mammoth', '@napi-rs/canvas', 'sharp'],
};

export default nextConfig;
