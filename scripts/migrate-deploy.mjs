import { execSync } from "node:child_process";

// `prisma migrate deploy` needs a *direct* (non-pooled) connection to hold
// its advisory lock.
//
// Neon has two pooler URL formats:
//   OLD: ep-name-pooler.us-east-1.aws.neon.tech          → ep-name.us-east-1.aws.neon.tech
//   NEW: ep-name-pooler.c-12.us-east-1.aws.neon.tech     → ep-name.us-east-1.aws.neon.tech
//
// We try DIRECT_URL first (explicit env var), then derive from DATABASE_URL.
const pooled = process.env.DATABASE_URL;
if (!pooled) {
  console.error("DATABASE_URL is not set — cannot run migrations.");
  process.exit(1);
}

function toDirectUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove "-pooler" suffix and any shard segment (e.g. ".c-12.") from the hostname.
    // Matches both:  ep-foo-pooler.c-12.region.neon.tech
    //           and: ep-foo-pooler.region.neon.tech
    parsed.hostname = parsed.hostname
      .replace(/-pooler(\.[a-z]-\d+)?\./, ".") // strip -pooler + optional shard
      .replace(/^(ep-[^.]+)-pooler\./, "$1."); // fallback: simple suffix strip
    // Remove channel_binding=require which is only safe on pooled connections
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    // If URL parsing fails, fall back to simple string replacement (original behaviour)
    return url.replace(/-pooler(\.[a-z]-\d+)?\.neon\.tech/, ".neon.tech");
  }
}

const direct = process.env.DIRECT_URL || toDirectUrl(pooled);

console.log("Running prisma migrate deploy (direct connection)…");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: direct },
});
