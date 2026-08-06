import { PrismaClient } from "@prisma/client";
import { truncateAll, seedDemoData } from "../src/lib/demo-data";
import { DEMO_ACCOUNTS } from "../src/lib/demo-accounts";

// The one-time (and repeatable) seed for the demo instance. Run by hand right
// after provisioning the second Vercel project + Neon DB — see
// docs/OPERATIONS.md §6. The nightly cron (src/app/api/cron/reset-demo)
// calls the same truncateAll()/seedDemoData() afterwards to keep it fresh;
// this script exists so you don't have to wait for 3 AM to see it work.
//
//   NEXT_PUBLIC_DEMO_MODE=true npm run db:seed:demo
//
// Guarded the same way prisma/seed.ts refuses to seed a real shop with its
// public default admin: this refuses to run at all unless the same flag the
// deployed app checks is set in the environment running it. A truncating
// script is not something that should ever be one accidental `npm run`
// against the wrong DATABASE_URL away from wiping a real shop.

const prisma = new PrismaClient();

async function main() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    throw new Error(
      "Refusing to run — NEXT_PUBLIC_DEMO_MODE is not \"true\" in this " +
        "shell. This script truncates every table before reseeding; it must " +
        "only ever run against the demo database. Set the env var explicitly " +
        "if you're sure DATABASE_URL points at the demo instance.",
    );
  }

  await truncateAll(prisma);
  await seedDemoData(prisma);

  console.log("Demo data seeded.\n");
  console.log(`Owner login:      ${DEMO_ACCOUNTS.owner.email} / ${DEMO_ACCOUNTS.owner.password}  (/staff/login)`);
  console.log(`Technician login: ${DEMO_ACCOUNTS.staff.email} / ${DEMO_ACCOUNTS.staff.password}  (/staff/login)`);
  console.log(`Customer login:   ${DEMO_ACCOUNTS.customer.email} / ${DEMO_ACCOUNTS.customer.password}  (/login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
