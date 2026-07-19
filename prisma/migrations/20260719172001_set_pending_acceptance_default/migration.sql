-- Update the default status to PENDING_ACCEPTANCE (separate from enum ADD VALUE above,
-- as PostgreSQL requires the enum value to be committed before it can be referenced)
ALTER TABLE "RepairTicket" ALTER COLUMN "status" SET DEFAULT 'PENDING_ACCEPTANCE'::"TicketStatus";
