import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getShopInfo } from "@/lib/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuickRepairForm } from "./quick-repair-form";
import { RepairLogForm } from "./repair-log-form";

export const metadata: Metadata = {
  title: "New repair",
};

// Two jobs share this address. The default is booking in a device that has
// just arrived: five fields, saved as Received. `?mode=past` is the long form
// for writing up a repair that is already finished, with its dates, parts and
// money — that one still starts on Picked Up.
export default async function NewRepairPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const past = mode === "past";

  const shop = await getShopInfo();
  const customers = past
    ? await prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className={past ? "mx-auto max-w-3xl space-y-6" : "mx-auto max-w-2xl space-y-6"}>
      <Link
        href="/admin/tickets"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All repairs
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {past ? "Add a past repair" : "New repair"}
            </h1>
          </CardTitle>
          <CardDescription>
            {past
              ? "Write up a repair that is already finished, with its dates, parts and money."
              : "Book in a device that has just arrived. It is saved as Received, and you get the customer's tracking link next."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {past ? <RepairLogForm customers={customers} /> : <QuickRepairForm problems={shop.commonProblems} />}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        {past ? (
          <>
            Device just arrived?{" "}
            <Link
              href="/admin/tickets/new"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Book in a new repair
            </Link>
          </>
        ) : (
          <>
            Logging an old repair that is already done?{" "}
            <Link
              href="/admin/tickets/new?mode=past"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Add a past repair
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
