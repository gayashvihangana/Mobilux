import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  EyeOff,
  MessageSquareQuote,
  Star,
  UserRound,
} from "lucide-react";
import type { TestimonialStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { testimonialsVisible } from "@/lib/settings";
import { APPROVED_ORDER, averageRating, initialsOf } from "@/lib/testimonials";
import { StarRating } from "@/components/star-rating";
import { cn, formatDateTime } from "@/lib/utils";
import {
  DeleteTestimonialButton,
  FeaturedToggle,
  ReorderButtons,
  SectionVisibilityToggle,
  StatusButtons,
  TestimonialDialog,
  type TestimonialRow,
} from "./testimonial-forms";

export const metadata: Metadata = {
  title: "Reviews",
};

const FILTERS = [
  { value: "pending", label: "Awaiting review", status: "PENDING" },
  { value: "published", label: "Published", status: "APPROVED" },
  { value: "hidden", label: "Hidden", status: "HIDDEN" },
  { value: "all", label: "All", status: null },
] as const;

const STATUS_BADGE: Record<
  TestimonialStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Awaiting review",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  APPROVED: {
    label: "Published",
    className: "border-success/30 bg-success/10 text-success",
  },
  HIDDEN: {
    label: "Hidden",
    className: "border-border bg-muted text-muted-foreground",
  },
};

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter =
    FILTERS.find((f) => f.value === filterParam) ??
    FILTERS.find((f) => f.value === "pending")!;

  const [rows, counts, approved, sectionVisible] = await Promise.all([
    prisma.testimonial.findMany({
      where: filter.status ? { status: filter.status } : {},
      // Published feedback shows in the exact order the home page uses so
      // the reorder arrows match what visitors see.
      orderBy:
        filter.status === "APPROVED"
          ? APPROVED_ORDER
          : [{ status: "asc" }, { createdAt: "desc" }],
      include: { user: { select: { email: true } } },
    }),
    prisma.testimonial.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.testimonial.findMany({
      where: { status: "APPROVED" },
      orderBy: APPROVED_ORDER,
      select: { id: true, rating: true },
    }),
    testimonialsVisible(),
  ]);

  const countOf = (status: TestimonialStatus) =>
    counts.find((c) => c.status === status)?._count._all ?? 0;
  const average = averageRating(approved.map((a) => a.rating));
  // Position in the published rail — drives which reorder arrows are live.
  const railIndex = new Map(approved.map((a, i) => [a.id, i]));

  const stats = [
    {
      label: "Awaiting review",
      value: String(countOf("PENDING")),
      icon: Clock,
      className: "text-warning",
    },
    {
      label: "Published",
      value: String(countOf("APPROVED")),
      icon: MessageSquareQuote,
      className: "text-success",
    },
    {
      label: "Average rating",
      value: approved.length > 0 ? average.toFixed(1) : "—",
      icon: Star,
      className: "text-primary",
    },
    {
      label: "Hidden",
      value: String(countOf("HIDDEN")),
      icon: EyeOff,
      className: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Reviews
          </h1>
          <p className="mt-1 text-muted-foreground">
            Customer feedback shown in the testimonial section on the home page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SectionVisibilityToggle initial={sectionVisible} />
          <TestimonialDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={cn("size-4", stat.className)} />
            </div>
            <p className="font-display mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter.value === f.value;
          const count = f.status ? countOf(f.status) : counts.reduce((n, c) => n + c._count._all, 0);
          return (
            <Link
              key={f.value}
              href={`/admin/testimonials?filter=${f.value}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 font-medium text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <MessageSquareQuote className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 font-semibold">Nothing here</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {filter.value === "pending"
              ? "No feedback is waiting for review right now."
              : "No feedback matches this filter yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((item) => {
            const row: TestimonialRow = {
              id: item.id,
              name: item.name,
              deviceLabel: item.deviceLabel,
              rating: item.rating,
              message: item.message,
              adminNote: item.adminNote,
              status: item.status,
              featured: item.featured,
            };
            const badge = STATUS_BADGE[item.status];
            const index = railIndex.get(item.id);
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                  item.featured && "border-primary/30 bg-primary/[0.03]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.avatarUrl ? (
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border">
                        <Image
                          src={item.avatarUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">
                        {initialsOf(item.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.name}</p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.deviceLabel ?? "No caption"}
                        {item.user?.email ? ` · ${item.user.email}` : ""}
                        {!item.userId ? (
                          <span className="ml-1 inline-flex items-center gap-1">
                            <UserRound className="size-3" /> added by shop
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={item.rating} />
                    <FeaturedToggle row={row} />
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>

                {item.adminNote ? (
                  <p className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Internal: {item.adminNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    Sent {formatDateTime(item.createdAt)}
                    {item.reviewedAt
                      ? ` · reviewed ${formatDateTime(item.reviewedAt)}`
                      : ""}
                    {item.ticketId ? (
                      <>
                        {" · "}
                        <Link
                          href={`/admin/tickets/${item.ticketId}`}
                          className="text-primary hover:underline"
                        >
                          view repair
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {item.status === "APPROVED" && index !== undefined ? (
                      <ReorderButtons
                        id={item.id}
                        canMoveUp={index > 0}
                        canMoveDown={index < approved.length - 1}
                      />
                    ) : null}
                    <StatusButtons row={row} />
                    <TestimonialDialog row={row} />
                    <DeleteTestimonialButton row={row} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
