import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necessário para Supabase SSR com cookies
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
