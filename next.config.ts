import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    serverActions: {
      // Receipt/photo uploads up to 5 MB each
      bodySizeLimit: "8mb",
    },
  },
  // The bill PDF reads the Newsreader TTFs from public/fonts at request time,
  // so make sure they're bundled into the serverless function.
  outputFileTracingIncludes: {
    "/bill/[id]/pdf/route": ["./public/fonts/*.ttf"],
  },
};

export default nextConfig;
