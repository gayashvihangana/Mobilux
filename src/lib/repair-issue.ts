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

// The small marker shown next to a ticket's status badge so an issue is
// visible at a glance in the admin list and detail header.
export function issueChip(
  issueStatus: RepairIssueStatus | null,
  refunded: boolean,
): { label: string; className: string } | null {
  if (issueStatus === "PENDING") {
    return {
      label: "Issue — awaiting customer",
      className: "bg-warning/15 text-warning border-warning/30",
    };
  }
  if (issueStatus === "ACCEPTED") {
    return {
      label: "Issue fixed free",
      className: "bg-warning/15 text-warning border-warning/30",
    };
  }
  if (issueStatus === "DECLINED" || refunded) {
    return {
      label: "Refunded",
      className: "bg-destructive/15 text-destructive border-destructive/30",
    };
  }
  return null;
}
