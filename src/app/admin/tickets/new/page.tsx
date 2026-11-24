import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getShopInfo } from "@/lib/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuickRepairForm } from "./quick-repair-form";

export const metadata: Metadata = {
  title: "New repair",
};

// One form for every repair the shop enters: a device that just arrived, one
// that came in earlier and is only being entered now (pick the Received
// day), or an old one that is already finished (More details > Step).
// `?mode=past` is kept for old links and opens with More details showing.
export default async function NewRepairPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const shop = await getShopInfo();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/tickets"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All repairs
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="font-display text-2xl font-bold tracking-tight">New repair</h1>
          </CardTitle>
          <CardDescription>
            Book in a device. Came in earlier? Pick the day it arrived. Already finished? Set it under More details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuickRepairForm problems={shop.commonProblems} openDetails={mode === "past"} />
        </CardContent>
      </Card>
    </div>
  );
}
