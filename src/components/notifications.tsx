import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import {
  NotificationsBell,
  type NotificationItem,
} from "@/components/notifications-bell";

// Server wrapper: fetches the user's latest notifications for the bell.
export async function Notifications({ userId }: { userId: string }) {
  const [latest, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  const items: NotificationItem[] = latest.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.read,
    createdAt: formatDateTime(n.createdAt),
  }));

  return <NotificationsBell items={items} unreadCount={unreadCount} />;
}
