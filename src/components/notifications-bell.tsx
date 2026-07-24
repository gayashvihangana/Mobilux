"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string; // pre-formatted on the server
};

const DROPDOWN_LIMIT = 6;

export function NotificationsBell({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  // Opening a notification marks it read instantly, then follows its link.
  const open = (item: NotificationItem) => {
    setMenuOpen(false);
    setAllOpen(false);
    if (!item.read) startTransition(() => markNotificationRead(item.id));
    if (item.href) router.push(item.href);
  };

  const markAll = () =>
    startTransition(() => markAllNotificationsRead());

  const recent = items.slice(0, DROPDOWN_LIMIT);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
                onClick={markAll}
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing here yet — updates about your repairs will appear here.
              </p>
            ) : (
              recent.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onOpen={() => open(item)}
                />
              ))
            )}
          </div>
          {items.length > 0 ? (
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAllOpen(true);
                }}
                className="w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-accent/50"
              >
                See all notifications
              </button>
            </div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* All notifications window */}
      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-4">
            <DialogTitle>All notifications</DialogTitle>
            {unreadCount > 0 ? (
              <button
                className="mr-6 inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={markAll}
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            ) : null}
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </p>
            ) : (
              items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onOpen={() => open(item)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/50"
    >
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
              "text-sm",
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
    </button>
  );
}
