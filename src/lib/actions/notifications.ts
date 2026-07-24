"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}

// Mark a single notification read — used the instant one is opened from the
// bell dropdown or the "all notifications" window.
export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.notification.updateMany({
    // Scoped to the owner so one user can't flip another's notifications.
    where: { id, userId: session.user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}
