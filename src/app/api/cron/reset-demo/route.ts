import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { truncateAll, seedDemoData } from "@/lib/demo-data";

// The one endpoint in the project that must never misfire against a real
// shop. vercel.json's cron entry is part of the shared repo, so BOTH the
// real Mobilux project and the demo project register a call to this same
// path on their own deployment — Vercel crons are project-scoped, not
// repo-scoped. That's exactly why there are three independent guards below,
// not one: two people (or one person, twice) have to get it wrong at once
// for this to ever touch a real shop's data.
//
// Manual test: curl -H "Authorization: Bearer $CRON_SECRET" https://<demo-url>/api/cron/reset-demo
// See docs/OPERATIONS.md §6.

export async function GET(request: Request) {
  // 1) proves the caller is Vercel Cron (or someone who has the secret) —
  //    not a random visitor who found the path.
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) proves THIS DEPLOYMENT is flagged as the demo build. This is the
  //    guard that makes the route a no-op on the real Mobilux project by
  //    default — it never has NEXT_PUBLIC_DEMO_MODE set.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "not a demo instance" }, { status: 403 });
  }

  // 3) proves the ACTUAL database connection is the demo one — independent
  //    of (2), which only proves someone set a flag correctly. Two separate
  //    pieces of configuration have to agree before anything is truncated.
  let host: string;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return NextResponse.json({ error: "DATABASE_URL is not a valid URL" }, { status: 500 });
  }
  if (!process.env.DEMO_DATABASE_HOST || host !== process.env.DEMO_DATABASE_HOST) {
    return NextResponse.json(
      { error: "refusing — DATABASE_URL does not match the demo host" },
      { status: 403 },
    );
  }

  await truncateAll(prisma);
  await seedDemoData(prisma);

  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() });
}
