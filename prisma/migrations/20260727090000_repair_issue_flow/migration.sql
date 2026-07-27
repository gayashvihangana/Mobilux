-- CreateEnum
CREATE TYPE "RepairIssueStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "RepairTicket" ADD COLUMN     "issueNote" TEXT,
ADD COLUMN     "issueReportedAt" TIMESTAMP(3),
ADD COLUMN     "issueResolvedAt" TIMESTAMP(3),
ADD COLUMN     "issueSolution" TEXT,
ADD COLUMN     "issueStatus" "RepairIssueStatus",
ADD COLUMN     "refunded" BOOLEAN NOT NULL DEFAULT false;
