import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  EyeOff,
  MessageSquareQuote,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DONE_TICKET_STATUSES } from "@/lib/completed-repairs";
import { StarRating } from "@/components/star-rating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEVICE_TYPES } from "@/lib/status";
import { shortDisplayName } from "@/lib/testimonials";
import { cn, formatDate } from "@/lib/utils";
import {
  FeedbackEmptyHint,
  FeedbackForm,
  WithdrawFeedbackButton,
} from "./feedback-forms";

export const metadata: Metadata = {
  title: "Leave feedback",
};

const STATUS_META = {
  PENDING: {
    label: "Awaiting review",
    icon: Clock,
    className: "border-warning/30 bg-warning/10 text-warning",
    note: "A team member will check it shortly.",
  },
  APPROVED: {
    label: "Published",
    icon: CheckCircle2,
    className: "border-success/30 bg-success/10 text-success",
    note: "Live on our home page — thank you!",
  },
  HIDDEN: {
    label: "Not published",
    icon: EyeOff,
    className: "border-border bg-muted text-muted-foreground",
    note: "Not shown on the site. Reach out if you think that's a mistake.",
  },
} as const;

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { ticket: ticketParam } = await searchParams;

  const [user, doneTickets, mine] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    }),
    prisma.repairTicket.findMany({
      where: {
        customerId: session.user.id,
        status: { in: DONE_TICKET_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ticketNumber: true,
        deviceType: true,
        brand: true,
        model: true,
        issueTitle: true,
      },
    }),
    prisma.testimonial.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user) redirect("/login");

  const reviewedTicketIds = new Set(
    mine.map((t) => t.ticketId).filter((id): id is string => !!id),
  );
  const tickets = doneTickets
    .filter((t) => !reviewedTicketIds.has(t.id))
    .map((t) => ({
      id: t.id,
      label: `${t.ticketNumber} · ${
        [t.brand, t.model].filter(Boolean).join(" ") ||
        DEVICE_TYPES.find((d) => d.value === t.deviceType)?.label ||
        "Device"
      }`,
    }));

  const hasPending = mine.some((t) => t.status === "PENDING");
  const preselected =
    ticketParam && tickets.some((t) => t.id === ticketParam)
      ? ticketParam
      : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Leave feedback
        </h1>
        <p className="mt-1 text-muted-foreground">
          Tell us how the repair went — approved reviews appear on our home
          page.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <MessageSquareQuote className="size-5 text-primary" /> Write a
              review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPending ? (
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                <Clock className="mt-0.5 size-4 shrink-0" />
                <p>
                  Your feedback is with our team for review. Once it&apos;s
                  published you can send another one.
                </p>
              </div>
            ) : (
              <FeedbackForm
                defaultName={shortDisplayName(user.name)}
                tickets={tickets}
                defaultTicketId={preselected}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Your feedback</h2>
          {mine.length === 0 ? (
            <FeedbackEmptyHint />
          ) : (
            <ul className="space-y-3">
              {mine.map((item) => {
                const meta = STATUS_META[item.status];
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StarRating rating={item.rating} size="sm" />
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                          meta.className,
                        )}
                      >
                        <meta.icon className="size-3" />
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                      {item.deviceLabel ? ` · ${item.deviceLabel}` : ""}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {meta.note}
                      </p>
                      <WithdrawFeedbackButton
                        id={item.id}
                        published={item.status === "APPROVED"}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* No link to the home-page rail: signed-in customers are routed
              away from the landing page, so it would only bounce them back. */}
          <p className="text-xs text-muted-foreground">
            Published reviews appear on our home page for visitors looking for
            a repair shop they can trust.
          </p>
        </div>
      </div>
    </div>
  );
}
