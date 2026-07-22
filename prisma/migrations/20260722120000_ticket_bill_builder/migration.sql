-- AlterTable
ALTER TABLE "RepairTicket" ADD COLUMN     "technician" TEXT,
ADD COLUMN     "billItems" JSONB,
ADD COLUMN     "billDiscountPercent" DECIMAL(5,2),
ADD COLUMN     "billDiscountAmount" DECIMAL(10,2),
ADD COLUMN     "billPayTo" JSONB,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidMethod" TEXT;
