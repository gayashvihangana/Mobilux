import type { Metadata } from "next";
import { ShieldCheck, Users, Wrench } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";
import { ActiveToggle, ResetPasswordDialog, StaffDialog } from "./staff-forms";

export const metadata: Metadata = {
  title: "Staff",
};

export default async function AdminStaffPage() {
  await requirePermission("staff:manage");

  const team = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      blocked: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const active = team.filter((m) => !m.blocked).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Staff
          </h1>
          <p className="mt-1 text-muted-foreground">
            Technician accounts. They can run the bench and the counter, but
            can&apos;t see your revenue, change settings or delete a repair.
          </p>
        </div>
        <StaffDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active accounts</p>
            <Users className="size-4 text-primary" />
          </div>
          <p className="font-display mt-2 text-3xl font-bold">{active}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Deactivated</p>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display mt-2 text-3xl font-bold">
            {team.length - active}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last signed in</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((member) => {
              const isAdmin = member.role === "ADMIN";
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                      {member.phone ? ` · ${member.phone}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        isAdmin
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {isAdmin ? (
                        <>
                          <ShieldCheck className="size-3" /> Owner
                        </>
                      ) : (
                        <>
                          <Wrench className="size-3" /> Technician
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.lastLoginAt
                      ? formatDateTime(member.lastLoginAt)
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      // The owner's own account is not manageable from here.
                      // Deactivating the last admin would lock everyone out of
                      // the shop's settings with no way back in.
                      <span className="text-xs text-muted-foreground">
                        Owner account
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <ResetPasswordDialog
                          id={member.id}
                          name={member.name}
                        />
                        <ActiveToggle
                          id={member.id}
                          name={member.name}
                          active={!member.blocked}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Deactivating signs the account out everywhere immediately — not when
        their session expires. Staff sign in at{" "}
        <span className="font-mono">/staff/login</span>, which isn&apos;t linked
        from the public site.
      </p>
    </div>
  );
}
