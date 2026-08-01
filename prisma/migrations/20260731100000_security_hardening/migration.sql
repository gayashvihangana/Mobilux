-- Session revocation: any JWT issued before this instant is rejected by
-- lib/auth-guard. Existing users get "now", so nobody is signed out by the
-- migration itself.
ALTER TABLE "User" ADD COLUMN "sessionsValidFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Unguessable public-tracker key. gen_random_uuid() is volatile, so Postgres
-- evaluates it per row and every existing ticket is backfilled with its own
-- distinct token (built in since PG13; Neon and the dev image are both newer).
ALTER TABLE "RepairTicket" ADD COLUMN "trackToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX "RepairTicket_trackToken_key" ON "RepairTicket"("trackToken");

-- Fixed-window rate limit counters (login, register, password reset, tracker).
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
