"use server";

import { revalidatePath } from "next/cache";
import { actionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsRead() {
  const user = await actionUser();
  if (!user) return;

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}

// Mark a single notification read — used the instant one is opened from the
// bell dropdown or the "all notifications" window.
export async function markNotificationRead(id: string) {
  const user = await actionUser();
  if (!user) return;

  await prisma.notification.updateMany({
    // Scoped to the owner so one user can't flip another's notifications.
    where: { id, userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}
