import "server-only";
import { prisma } from "@/lib/prisma";

// Public repair tracker lookups.
//
// Two ways in, and neither of them is "guess a ticket number":
//
//  1. The tracking link / QR code — keyed on the ticket's random trackToken.
//     This is what the shop hands a walk-in customer who has no account, and
//     what the printed bill's QR points at.
//  2. Manual entry — ticket number plus the last 4 digits of the phone number
//     on the account the ticket belongs to. For customers holding an older
//     printed receipt that predates the token.
//
// Everything returned here is rendered to someone who is not signed in, so
// the select list below is the whole contract: no admin notes, no costs, no
// customer contact details, no photos.

const PUBLIC_SELECT = {
  ticketNumber: true,
  deviceType: true,
  brand: true,
  model: true,
  issueTitle: true,
  status: true,
  createdAt: true,
  completedAt: true,
  issues: {
    orderBy: { reportedAt: "asc" },
    select: { status: true, reportedAt: true },
  },
  statusUpdates: {
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  },
} as const;

export type PublicTicket = NonNullable<
  Awaited<ReturnType<typeof findByToken>>
>;

export async function findByToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  return prisma.repairTicket.findUnique({
    where: { trackToken: trimmed },
    select: PUBLIC_SELECT,
  });
}

/** Digits only, so "+94 71 234 5678" and "0712345678" compare equal. */
function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Ticket number + last 4 digits of the phone on file. Returns null for a
 * wrong number, a wrong phone, or a ticket with no phone recorded — the
 * caller shows one identical "not found" message for all three, so this
 * cannot be used to discover which ticket numbers exist.
 */
export async function findByNumberAndPhone(
  ticketNumber: string,
  phoneLast4: string,
) {
  const number = ticketNumber.trim();
  const last4 = digits(phoneLast4);
  if (!number || last4.length !== 4) return null;

  const ticket = await prisma.repairTicket.findFirst({
    where: { ticketNumber: { equals: number, mode: "insensitive" } },
    select: { ...PUBLIC_SELECT, customer: { select: { phone: true } } },
  });
  if (!ticket) return null;

  // Walk-in tickets carry no phone number, so there is nothing to check
  // against and they stay reachable only by their tracking link.
  const onFile = ticket.customer?.phone;
  if (!onFile) return null;

  const tail = digits(onFile).slice(-4);
  if (tail.length !== 4 || tail !== last4) return null;

  const { customer: _customer, ...publicFields } = ticket;
  return publicFields;
}
