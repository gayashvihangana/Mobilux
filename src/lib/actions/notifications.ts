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
