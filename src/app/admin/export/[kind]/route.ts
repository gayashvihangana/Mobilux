import { actionPermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/status";

// Settings → Data: download repairs or customers as CSV. Admin only (the same
// permission as Settings), because both files hold customers' phone numbers.

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  // A cell starting with = + - @ runs as a formula in Excel; a leading
  // apostrophe makes it plain text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: unknown[][]): string {
  // The byte-order mark makes Excel read Sinhala and Tamil names correctly.
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

function download(name: string, body: string) {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  if (!(await actionPermission("settings:write"))) {
    return new Response("Not authorized.", { status: 403 });
  }
  const { kind } = await params;

  if (kind === "repairs") {
    const tickets = await prisma.repairTicket.findMany({
      orderBy: { createdAt: "asc" },
      include: { customer: { select: { name: true, phone: true, email: true } } },
    });
    return download(
      "repairs",
      csv([
        [
          "Repair", "Received", "Status", "Customer", "Phone", "Email", "Brand",
          "Model", "Problem", "Solution", "Quoted (LKR)", "Bill (LKR)", "Paid (LKR)",
          "Parts and costs (LKR)", "Finished",
        ],
        ...tickets.map((t) => [
          t.ticketNumber,
          t.createdAt,
          statusLabel(t.status),
          t.customer?.name ?? t.customerName,
          t.customerPhone || t.customer?.phone,
          t.customer?.email,
          t.brand,
          t.model,
          t.issueTitle,
          t.solution,
          t.estimatedCost?.toString(),
          t.finalCost?.toString(),
          t.paidAmount?.toString(),
          t.partsCost?.toString(),
          t.completedAt,
        ]),
      ]),
    );
  }

  if (kind === "customers") {
    const [accounts, walkIns] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        orderBy: { name: "asc" },
        select: {
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: { select: { tickets: true } },
        },
      }),
      prisma.repairTicket.findMany({
        where: { customerId: null },
        orderBy: { createdAt: "asc" },
        select: { customerName: true, customerPhone: true, createdAt: true },
      }),
    ]);

    // Walk-ins have no record of their own: one row per phone number (or per
    // name when there is no phone), with how many repairs they brought in.
    const people = new Map<string, { name: string; phone: string; first: Date; repairs: number }>();
    for (const t of walkIns) {
      const phone = t.customerPhone?.replace(/\D/g, "") ?? "";
      const key = phone || `name:${(t.customerName ?? "").toLowerCase()}`;
      const known = people.get(key);
      if (known) known.repairs += 1;
      else
        people.set(key, {
          name: t.customerName ?? "",
          phone: t.customerPhone ?? "",
          first: t.createdAt,
          repairs: 1,
        });
    }

    return download(
      "customers",
      csv([
        ["Name", "Phone", "Email", "Type", "First seen", "Repairs"],
        ...accounts.map((a) => [a.name, a.phone, a.email, "Account", a.createdAt, a._count.tickets]),
        ...[...people.values()].map((p) => [p.name, p.phone, "", "Walk-in", p.first, p.repairs]),
      ]),
    );
  }

  return new Response("Not found.", { status: 404 });
}
