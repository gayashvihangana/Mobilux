import type { Metadata } from "next";
import { BadgePercent, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DeleteRuleButton,
  DiscountRuleDialog,
  RuleActiveToggle,
} from "./discount-rule-forms";

export const metadata: Metadata = {
  title: "Loyalty discounts",
};

export default async function AdminLoyaltyPage() {
  const rules = await prisma.discountRule.findMany({
    orderBy: { minRepairs: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Loyalty discounts
          </h1>
          <p className="mt-1 text-muted-foreground">
            Automatic discounts customers earn as they complete more repairs.
          </p>
        </div>
        <DiscountRuleDialog />
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          The highest active rule a customer qualifies for is applied to their
          bill. Example: with rules at 3 repairs → 5% and 10 repairs → 10%, a
          customer with 12 completed repairs gets 10% off.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>From (completed repairs)</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  No discount rules yet — create one to start rewarding repeat
                  customers.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    {rule.minRepairs} repair{rule.minRepairs === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                      <BadgePercent className="size-4" />
                      {Number(rule.discountPercent)}% off
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        rule.active ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {rule.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <RuleActiveToggle
                        rule={{
                          id: rule.id,
                          minRepairs: rule.minRepairs,
                          discountPercent: rule.discountPercent.toString(),
                          active: rule.active,
                        }}
                      />
                      <DiscountRuleDialog
                        rule={{
                          id: rule.id,
                          minRepairs: rule.minRepairs,
                          discountPercent: rule.discountPercent.toString(),
                          active: rule.active,
                        }}
                      />
                      <DeleteRuleButton
                        rule={{
                          id: rule.id,
                          minRepairs: rule.minRepairs,
                          discountPercent: rule.discountPercent.toString(),
                          active: rule.active,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
