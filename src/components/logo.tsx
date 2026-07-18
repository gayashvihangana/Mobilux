import Link from "next/link";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/15 transition-colors group-hover:bg-primary/25">
        <Smartphone className="size-4.5 text-primary" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        Mobilux
      </span>
    </Link>
  );
}
