import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Wrench } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/ticket-card";

export const metadata: Metadata = {
  title: "My repairs",
};

export default async function RepairsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.repairTicket.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            My repairs
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every repair you&apos;ve done with Mobilux, past and present.
          </p>
        </div>
        <Button asChild>
          <Link href="/repairs/new">
            <Plus className="size-4" /> New repair
          </Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Wrench className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 font-semibold">No repairs yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            When you submit a repair request it will show up here with live
            status tracking.
          </p>
          <Button asChild className="mt-5">
            <Link href="/repairs/new">
              <Plus className="size-4" /> Start your first repair
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              href={`/repairs/${ticket.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
