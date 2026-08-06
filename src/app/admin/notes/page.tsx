import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { JournalNote } from "@/components/journal-note";
import { formatDate } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Notes & Lessons",
};

export default async function AdminNotesPage() {
  await requirePermission("report:read");
  const tickets = await prisma.repairTicket.findMany({
    where: { adminNotes: { not: null } },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      ticketNumber: true,
      brand: true,
      model: true,
      issueTitle: true,
      adminNotes: true,
      completedAt: true,
      createdAt: true,
      customer: { select: { name: true } },
      customerName: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          <NotebookPen className="size-7 text-muted-foreground" />
          Notes & lessons
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every private note you&apos;ve written across all repairs — mistakes,
          fixes, and things worth remembering. {tickets.length} entr
          {tickets.length === 1 ? "y" : "ies"}, private to you.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-muted/40">
            <NotebookPen className="size-5 text-muted-foreground" />
          </span>
          <h3 className="mt-4 font-semibold">No notes yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add a note on any ticket&apos;s Notes &amp; Lessons tab — they&apos;ll
            all show up here, newest first.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {tickets.map((ticket) => {
            const deviceName =
              [ticket.brand, ticket.model].filter(Boolean).join(" ") ||
              "Device";
            const owner = ticket.customer?.name ?? ticket.customerName ?? "Unknown";
            const date = ticket.completedAt ?? ticket.createdAt;
            return (
              <div key={ticket.id} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
                  <Link
                    href={`/admin/tickets/${ticket.id}`}
                    className="text-sm font-semibold hover:text-primary"
                  >
                    {ticket.ticketNumber} · {deviceName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {owner} · {ticket.issueTitle} · {formatDate(date)}
                  </p>
                </div>
                <JournalNote text={ticket.adminNotes!} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
