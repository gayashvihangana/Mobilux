import type { RepairIssueStatus, TicketStatus } from "@prisma/client";

// Statuses where the device is physically at the shop and the repair isn't
// handed back yet — the only window in which an issue can be reported.
export const ISSUE_REPORTABLE_STATUSES: TicketStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "AWAITING_PARTS",
  "IN_PROGRESS",
  "COMPLETED",
  "READY_FOR_PICKUP",
];

// The shape every issue-aware component works with — the RepairIssue row
// trimmed to what the UI actually renders.
export type IssueSummary = {
  id: string;
  status: RepairIssueStatus;
  note: string;
  solution: string | null;
  reportedAt: Date;
  resolvedAt: Date | null;
};

// The one issue waiting on the customer, if any. Only ever one at a time —
// reportRepairIssue refuses to open a second while this is unresolved.
export function pendingIssue(issues: IssueSummary[]): IssueSummary | null {
  return issues.find((i) => i.status === "PENDING") ?? null;
}

// The small marker shown next to a ticket's status badge so issues are
// visible at a glance in the admin list and detail header.
export function issueChip(
  issues: Pick<IssueSummary, "status">[],
  refunded: boolean,
): { label: string; className: string } | null {
  if (issues.some((i) => i.status === "PENDING")) {
    return {
      label: "Issue — awaiting customer",
      className: "bg-warning/15 text-warning border-warning/30",
    };
  }
  if (refunded || issues.some((i) => i.status === "DECLINED")) {
    return {
      label: "Refunded",
      className: "bg-destructive/15 text-destructive border-destructive/30",
    };
  }
  const accepted = issues.filter((i) => i.status === "ACCEPTED").length;
  if (accepted > 0) {
    return {
      label: accepted > 1 ? `${accepted} issues fixed free` : "Issue fixed free",
      className: "bg-warning/15 text-warning border-warning/30",
    };
  }
  return null;
}
