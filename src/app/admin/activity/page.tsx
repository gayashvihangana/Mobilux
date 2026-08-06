import type { Metadata } from "next";
import { History, ListChecks, UsersRound } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { actionLabel, describeAuditMeta } from "@/lib/audit";
import { CountUp } from "@/components/count-up";
import { FilterMenu, type MenuGroup } from "@/components/filter-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Activity",
};

const PAGE_SIZE = 50;

// Nothing writes here except lib/audit.ts's logAudit(). This page reads only
// — deleting an entry would defeat the point of an audit log.

const RANGE_DAYS = { today: 1, "7d": 7, "30d": 30 } as const;
type RangeKey = keyof typeof RANGE_DAYS | "all";

function rangeStart(key: RangeKey): Date | null {
  if (key === "all") return null;
  if (key === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(Date.now() - RANGE_DAYS[key] * 24 * 60 * 60 * 1000);
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Owner",
  STAFF: "Staff",
  CUSTOMER: "Customer",
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; range?: string; page?: string }>;
}) {
  await requirePermission("audit:read");
  const params = await searchParams;
  const range: RangeKey =
    params.range === "today" || params.range === "7d" || params.range === "30d"
      ? params.range
      : "all";
  const actorFilter = params.actor ?? "all";
  const page = Math.max(1, Number(params.page) || 1);

  const since = rangeStart(range);
  const actorWhere =
    actorFilter === "all"
      ? {}
      : actorFilter === "unknown"
        ? { actorId: null }
        : { actorId: actorFilter };
  const where = {
    ...actorWhere,
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const todayStart = rangeStart("today")!;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, entriesToday, actorGroups, activeActors30d, entries, matchCount] =
    await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.auditLog.groupBy({
        by: ["actorId", "actorName"],
        where: { createdAt: { gte: ninetyDaysAgo } },
        _count: { _all: true },
        orderBy: { _count: { actorId: "desc" } },
        take: 20,
      }),
      prisma.auditLog.groupBy({
        by: ["actorId"],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ]);

  const stats = [
    { label: "Total entries", value: total, icon: History, className: "text-primary" },
    {
      label: "Today",
      value: entriesToday,
      icon: ListChecks,
      className: "text-foreground",
    },
    {
      label: "Active people",
      value: activeActors30d.length,
      icon: UsersRound,
      className: "text-foreground",
      sub: "last 30 days",
    },
  ];

  const whoGroup: MenuGroup = {
    param: "actor",
    label: "Who",
    defaultValue: "all",
    value: actorFilter,
    options: [
      { value: "all", label: "Everyone" },
      ...actorGroups.map((g) => ({
        value: g.actorId ?? "unknown",
        label: g.actorId ? g.actorName : `${g.actorName} (deleted)`,
        count: g._count._all,
      })),
    ],
  };

  const whenGroup: MenuGroup = {
    param: "range",
    label: "When",
    defaultValue: "all",
    value: range,
    options: [
      { value: "all", label: "All time" },
      { value: "today", label: "Today" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
    ],
  };

  const totalPages = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  const pageParams = { actor: params.actor, range: params.range };
  function pageHref(target: number) {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(pageParams)) if (v) next.set(k, v);
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `/admin/activity?${qs}` : "/admin/activity";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Activity
        </h1>
        <p className="mt-1 text-muted-foreground">
          Who deleted a repair or moved money, and when. Read-only — nothing
          here can be edited or removed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("size-4", stat.className)} />
            </div>
            <p className="font-display mt-2 text-3xl font-bold">
              <CountUp value={stat.value} />
            </p>
            {stat.sub ? (
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterMenu
          basePath="/admin/activity"
          params={pageParams}
          groups={[whoGroup]}
          label="Who"
        />
        <FilterMenu
          basePath="/admin/activity"
          params={pageParams}
          groups={[whenGroup]}
          label="When"
          icon="sort"
        />
      </div>

      {/* Entries */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nothing recorded yet for this filter.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{entry.actorName}</span>
                      <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {ROLE_LABEL[entry.actorRole] ?? entry.actorRole}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{actionLabel(entry.action)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {entry.entityType}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {describeAuditMeta(entry.action, entry.meta)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <a href={pageHref(page - 1)}>Previous</a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button variant="outline" size="sm" asChild>
                <a href={pageHref(page + 1)}>Next</a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
