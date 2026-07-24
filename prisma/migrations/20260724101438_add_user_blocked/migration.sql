-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unblockRequested" BOOLEAN NOT NULL DEFAULT false;
