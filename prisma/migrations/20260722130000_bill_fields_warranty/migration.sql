-- AlterTable
ALTER TABLE "RepairTicket" ADD COLUMN     "warrantyPeriod" TEXT,
ADD COLUMN     "warrantyParts" TEXT,
ADD COLUMN     "billShow" JSONB;
