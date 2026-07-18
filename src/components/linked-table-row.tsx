"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Whole-row navigation without absolutely-positioned overlay links —
// `position: relative` on <tr> is unsupported in Safari, which made
// stretched-link rows navigate to the wrong ticket on mobile.
export function LinkedTableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        // Let real links/buttons inside the row (e.g. the Bill link) win.
        if ((e.target as HTMLElement).closest("a,button")) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
