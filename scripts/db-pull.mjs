import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Copies your LIVE (production/Neon) database down into your LOCAL database
// so local dev matches what's online. One-directional and safe: production
// is only read from (pg_dump), never written to. Your local data is replaced.
//
// Requires: the local Docker container `mobilux-db` running (it ships with
// pg_dump/psql v17), and PROD_DATABASE_URL set in .env.

function fromEnvFile(key) {
  try {
    const line = readFileSync(".env", "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith(`${key}=`));
    if (!line) return undefined;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

const prodRaw = process.env.PROD_DATABASE_URL || fromEnvFile("PROD_DATABASE_URL");
const local = process.env.DATABASE_URL || fromEnvFile("DATABASE_URL");

if (!prodRaw) {
  console.error("PROD_DATABASE_URL is not set in .env — add your Neon URL first.");
  process.exit(1);
}
if (!local) {
  console.error("DATABASE_URL is not set in .env.");
  process.exit(1);
}

// Use Neon's direct (non-pooled) host for the dump to avoid pooler quirks.
const prod = prodRaw.replace("-pooler.", ".");
const container = "mobilux-db";
// From inside the container, its own postgres is reachable on 127.0.0.1.
const localInside = local.replace(/@localhost:/, "@127.0.0.1:");

console.log("Pulling production data into your local database…");
console.log("(production is only read — never modified)\n");

// Whole pipeline runs inside the container's shell. We invoke `docker`
// directly (execFileSync, no host shell) so Windows cmd.exe never mangles
// the quotes or the pipe — the pipeline string reaches the container intact.
const pipeline = `pg_dump "${prod}" --no-owner --no-privileges --clean --if-exists | psql "${localInside}"`;

try {
  execFileSync("docker", ["exec", "-i", container, "sh", "-c", pipeline], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log("\n✅ Local database now matches production.");
} catch {
  console.error(
    "\nSync failed. Make sure the Docker container 'mobilux-db' is running.",
  );
  process.exit(1);
}
