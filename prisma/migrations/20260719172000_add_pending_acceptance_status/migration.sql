-- AlterEnum
-- Add PENDING_ACCEPTANCE to the TicketStatus enum (before RECEIVED in lifecycle)
-- NOTE: ALTER TYPE ... ADD VALUE cannot be used inside a transaction block,
-- so we must commit before using the new value in ALTER TABLE.
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'PENDING_ACCEPTANCE' BEFORE 'RECEIVED';
