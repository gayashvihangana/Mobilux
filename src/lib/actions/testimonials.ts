"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TestimonialStatus } from "@prisma/client";
import { actionAdmin, actionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { DONE_TICKET_STATUSES } from "@/lib/completed-repairs";
import {
  APPROVED_ORDER,
  MESSAGE_MAX,
  MESSAGE_MIN,
  deviceLabelFor,
} from "@/lib/testimonials";
import {
  TESTIMONIALS_VISIBLE_KEY,
  setSetting,
} from "@/lib/settings";

export type TestimonialFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

async function requireUser() {
  return actionUser();
}

async function requireAdmin() {
  return actionAdmin();
}

// The home page renders approved testimonials, so every change has to reach
// the marketing route too — not just the pages that manage them.
function revalidateTestimonials() {
  revalidatePath("/");
  revalidatePath("/feedback");
  revalidatePath("/admin/testimonials");
}

const feedbackSchema = z.object({
  rating: z.coerce
    .number()
    .int("Pick a star rating")
    .min(1, "Pick a star rating")
    .max(5, "Pick a star rating"),
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, `Tell us a little more — at least ${MESSAGE_MIN} characters`)
    .max(MESSAGE_MAX, `Please keep it under ${MESSAGE_MAX} characters`),
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(60, "Name is too long"),
  ticketId: z.string().trim().optional().or(z.literal("")),
});

// ── Customer side ────────────────────────────────────────────────────

export async function submitTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  const user = await requireUser();
  if (!user) return { error: "Please log in to leave feedback." };

  const parsed = feedbackSchema.safeParse({
    rating: formData.get("rating"),
    message: formData.get("message") ?? "",
    name: formData.get("name") ?? "",
    ticketId: formData.get("ticketId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { rating, message, name } = parsed.data;
  // "none" is the select's placeholder option — feedback about the shop
  // rather than one specific repair.
  const ticketId =
    parsed.data.ticketId && parsed.data.ticketId !== "none"
      ? parsed.data.ticketId
      : "";

  // One review waiting at a time — otherwise a single customer could flood
  // the moderation queue.
  const pending = await prisma.testimonial.count({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pending > 0) {
    return {
      error:
        "You already have feedback waiting for review — we'll publish it shortly.",
    };
  }

  // A review can be tied to one of the customer's finished repairs, which
  // gives the home-page card its "iPhone 13 · Screen replacement" caption.
  let deviceLabel: string | null = null;
  let linkedTicketId: string | null = null;
  if (ticketId) {
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        customerId: true,
        status: true,
        deviceType: true,
        brand: true,
        model: true,
        issueTitle: true,
      },
    });
    if (!ticket || ticket.customerId !== user.id) {
      return { error: "That repair isn't on your account." };
    }
    if (!DONE_TICKET_STATUSES.includes(ticket.status)) {
      return { error: "You can review a repair once it's finished." };
    }
    const already = await prisma.testimonial.count({
      where: { userId: user.id, ticketId: ticket.id },
    });
    if (already > 0) {
      return { error: "You've already reviewed that repair." };
    }
    linkedTicketId = ticket.id;
    deviceLabel = deviceLabelFor(ticket);
  }

  const author = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.testimonial.create({
      data: {
        userId: user.id,
        ticketId: linkedTicketId,
        name,
        deviceLabel,
        rating,
        message,
        avatarUrl: author?.avatarUrl ?? null,
      },
    });

    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: `New ${rating}★ feedback from ${name}`,
          body:
            message.length > 120 ? `${message.slice(0, 120)}…` : message,
          href: "/admin/testimonials",
        })),
      });
    }
  });

  revalidateTestimonials();
  return { success: true };
}

// The author can pull their own review at any point — published or not.
export async function withdrawTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  const user = await requireUser();
  if (!user) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Feedback not found." };

  const deleted = await prisma.testimonial.deleteMany({
    where: { id, userId: user.id },
  });
  if (deleted.count === 0) return { error: "Feedback not found." };

  revalidateTestimonials();
  return { success: true };
}

// ── Admin moderation ─────────────────────────────────────────────────

const adminSchema = feedbackSchema
  .omit({ ticketId: true })
  .extend({
    deviceLabel: z.string().trim().max(120).optional().or(z.literal("")),
    adminNote: z.string().trim().max(300).optional().or(z.literal("")),
  });

export async function createTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const parsed = adminSchema.safeParse({
    rating: formData.get("rating"),
    message: formData.get("message") ?? "",
    name: formData.get("name") ?? "",
    deviceLabel: formData.get("deviceLabel") ?? "",
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Walk-in feedback is typed in by the shop, so it's already vetted —
  // publish it straight away.
  await prisma.testimonial.create({
    data: {
      name: parsed.data.name,
      deviceLabel: parsed.data.deviceLabel || null,
      rating: parsed.data.rating,
      message: parsed.data.message,
      adminNote: parsed.data.adminNote || null,
      status: "APPROVED",
      reviewedAt: new Date(),
    },
  });

  revalidateTestimonials();
  return { success: true };
}

// Edits the shop's OWN walk-in entries only. A review a customer wrote is
// published under their name and avatar, so the shop moderates it — publish,
// hide, pin, delete — but never rewrites their words or their star rating.
// Enforced here rather than only in the UI: the id arrives from the client.
export async function updateTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Feedback not found." };

  const existing = await prisma.testimonial.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) return { error: "Feedback not found." };
  if (existing.userId) {
    return {
      error:
        "This review was written by the customer — it can't be edited. You can hide or delete it instead.",
    };
  }

  const parsed = adminSchema.safeParse({
    rating: formData.get("rating"),
    message: formData.get("message") ?? "",
    name: formData.get("name") ?? "",
    deviceLabel: formData.get("deviceLabel") ?? "",
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.testimonial.update({
    where: { id },
    data: {
      name: parsed.data.name,
      deviceLabel: parsed.data.deviceLabel || null,
      rating: parsed.data.rating,
      message: parsed.data.message,
      adminNote: parsed.data.adminNote || null,
    },
  });

  revalidateTestimonials();
  return { success: true };
}

// The internal note is the shop's own moderation record — never rendered on
// the site — so it stays editable on a customer's review even though nothing
// else about it is.
const noteSchema = z.string().trim().max(300, "Keep the note under 300 characters");

export async function updateTestimonialNote(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Feedback not found." };

  const parsed = noteSchema.safeParse(formData.get("adminNote") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { adminNote: parsed.error.flatten().formErrors } };
  }

  const updated = await prisma.testimonial.updateMany({
    where: { id },
    data: { adminNote: parsed.data || null },
  });
  if (updated.count === 0) return { error: "Feedback not found." };

  revalidateTestimonials();
  return { success: true };
}

export async function setTestimonialStatus(
  id: string,
  status: TestimonialStatus,
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const existing = await prisma.testimonial.findUnique({
    where: { id },
    select: { status: true, userId: true, name: true },
  });
  if (!existing) return { error: "Feedback not found." };

  await prisma.$transaction(async (tx) => {
    await tx.testimonial.update({
      where: { id },
      data: {
        status,
        featured: status === "APPROVED" ? undefined : false,
        reviewedAt: new Date(),
      },
    });

    // Tell the customer the first time their words go live — going from
    // hidden back to published isn't news worth a second ping.
    if (status === "APPROVED" && existing.status === "PENDING" && existing.userId) {
      await tx.notification.create({
        data: {
          userId: existing.userId,
          title: "Your feedback is live",
          body: "Thanks for the kind words — your review is now on our home page.",
          href: "/feedback",
        },
      });
    }
  });

  revalidateTestimonials();
  return { success: true };
}

export async function toggleTestimonialFeatured(
  id: string,
  featured: boolean,
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const existing = await prisma.testimonial.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return { error: "Feedback not found." };
  if (featured && existing.status !== "APPROVED") {
    return { error: "Publish the feedback before featuring it." };
  }

  await prisma.testimonial.update({ where: { id }, data: { featured } });

  revalidateTestimonials();
  return { success: true };
}

// Move one testimonial up or down the published rail. sortOrder values are
// rewritten as a dense 0..n-1 sequence so imported/legacy rows (all at 0)
// settle into a stable order on the first move.
export async function moveTestimonial(
  id: string,
  direction: "up" | "down",
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const approved = await prisma.testimonial.findMany({
    where: { status: "APPROVED" },
    orderBy: APPROVED_ORDER,
    select: { id: true },
  });
  const index = approved.findIndex((t) => t.id === id);
  if (index === -1) return { error: "Feedback not found." };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= approved.length) return { success: true };

  const reordered = [...approved];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await prisma.$transaction(
    reordered.map((row, i) =>
      prisma.testimonial.update({
        where: { id: row.id },
        data: { sortOrder: i },
      }),
    ),
  );

  revalidateTestimonials();
  return { success: true };
}

export async function deleteTestimonial(
  _prev: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Feedback not found." };

  await prisma.testimonial.delete({ where: { id } });

  revalidateTestimonials();
  return { success: true };
}

export async function setTestimonialsVisibility(visible: boolean) {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  await setSetting(TESTIMONIALS_VISIBLE_KEY, visible ? "true" : "false");
  revalidateTestimonials();
  return { success: true };
}
