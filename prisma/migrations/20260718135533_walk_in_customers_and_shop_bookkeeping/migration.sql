-- DropForeignKey
ALTER TABLE "RepairTicket" DROP CONSTRAINT "RepairTicket_customerId_fkey";

-- AlterTable
ALTER TABLE "RepairTicket" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "forgottenParts" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(10,2),
ADD COLUMN     "partsCost" DECIMAL(10,2),
ADD COLUMN     "partsSupplier" TEXT,
ADD COLUMN     "partsUsed" TEXT,
ADD COLUMN     "solution" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "brand" DROP NOT NULL,
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "issueDescription" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RepairTicket" ADD CONSTRAINT "RepairTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
