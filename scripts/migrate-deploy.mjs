import { execSync } from "node:child_process";

// `prisma migrate deploy` needs a *direct* (non-pooled) connection to hold
// its advisory lock. Neon's pooled host contains "-pooler"; the direct host
// is the same without it. We swap DATABASE_URL to the direct connection for
// the migrate command only — the app's runtime queries keep using the
// pooled URL from the environment. Works with no extra Vercel env vars.
const pooled = process.env.DATABASE_URL;
if (!pooled) {
  console.error("DATABASE_URL is not set — cannot run migrations.");
  process.exit(1);
}

const direct = process.env.DIRECT_URL || pooled.replace("-pooler.", ".");

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: direct },
});
