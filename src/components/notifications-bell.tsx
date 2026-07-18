"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string; // pre-formatted on the server
};

export function NotificationsBell({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="size-4.5" />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <button
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              disabled={pending}
              onClick={() => startTransition(() => markAllNotificationsRead())}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing here yet — updates about your repairs will appear here.
            </p>
          ) : (
            items.map((item) => {
              const content = (
                <>
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        item.read ? "bg-transparent" : "bg-primary",
                      )}
                    />
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-sm",
                          item.read ? "text-muted-foreground" : "font-medium",
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {item.createdAt}
                      </p>
                    </div>
                  </div>
                </>
              );
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-accent/50"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.id}
                  className="border-b border-border/50 px-4 py-3 last:border-0"
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
