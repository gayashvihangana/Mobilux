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
      // Vercel rejects a serverless request body over ~4.5 MB before it ever
      // reaches the action, so allowing more here only hid the real limit.
      // Uploads are downscaled in the browser (see <FileInput>) to fit.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
