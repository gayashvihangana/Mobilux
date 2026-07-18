import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepairLogForm } from "./repair-log-form";

export const metadata: Metadata = {
  title: "New repair log",
};

export default async function NewRepairLogPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All tickets
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">New repair log</CardTitle>
          <CardDescription>
            Record a walk-in or past repair manually — link it to a customer
            account, or just enter their name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepairLogForm customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
