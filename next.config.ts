import type { NextConfig } from "next";

// Content-Security-Policy.
//
// `'unsafe-inline'` on script-src is not ideal, but Next's App Router emits
// inline bootstrap and flight-data scripts, and next-themes writes an inline
// script to set the theme before first paint. Removing it means plumbing a
// nonce through middleware into every response, which cannot be done while
// any route is statically rendered. React escapes all interpolated values and
// the only two raw-HTML sinks in the app are JSON-LD blocks that are unicode
// escaped (see jsonLdScript), so the practical XSS surface is already closed;
// this policy is the second layer, and `frame-ancestors` / `form-action` /
// `base-uri` below do real work regardless.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // data: for QR codes, blob: for the client-rendered PDF bill.
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://res.cloudinary.com",
  // next/font/google self-hosts at build time — nothing external to allow.
  "font-src 'self' data:",
  "connect-src 'self' https://*.public.blob.vercel-storage.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces alongside frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Uploaded receipt and repair-photo URLs are unguessable but permanent, so
  // they must never travel to a third party in a Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

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
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Receipts and repair photos must never be cached by a shared proxy.
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
