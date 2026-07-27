-- CreateTable
CREATE TABLE "RepairIssue" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "status" "RepairIssueStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL,
    "solution" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairIssue_ticketId_idx" ON "RepairIssue"("ticketId");

-- AddForeignKey
ALTER TABLE "RepairIssue" ADD CONSTRAINT "RepairIssue_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "RepairTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over the single issue each ticket could hold before this change.
INSERT INTO "RepairIssue" ("id", "ticketId", "status", "note", "solution", "reportedAt", "resolvedAt", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "issueStatus",
    COALESCE("issueNote", ''),
    "issueSolution",
    COALESCE("issueReportedAt", CURRENT_TIMESTAMP),
    "issueResolvedAt",
    COALESCE("issueReportedAt", CURRENT_TIMESTAMP)
FROM "RepairTicket"
WHERE "issueStatus" IS NOT NULL;

-- DropColumn
ALTER TABLE "RepairTicket" DROP COLUMN "issueStatus",
DROP COLUMN "issueNote",
DROP COLUMN "issueSolution",
DROP COLUMN "issueReportedAt",
DROP COLUMN "issueResolvedAt";
