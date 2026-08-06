import Link from "next/link";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

// The shop's mark and name. This renders inside client components (the mobile
// nav sheet), which cannot read the database, so identity arrives as a prop
// from the nearest async layout rather than being imported from config.
export type ShopBrand = {
  name: string;
  /** Uploaded logo image — wins over the emoji when both are set. */
  logoUrl?: string;
  /** A single emoji standing in for a logo. */
  logoEmoji?: string;
};

export function Logo({
  brand,
  className,
  href = "/",
}: {
  brand: ShopBrand;
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-primary/30 bg-primary/15 transition-colors group-hover:bg-primary/25">
        {brand.logoUrl ? (
          // Plain <img>: the URL is whatever blob store the shop is on, and
          // next/image would need every one of those hosts allow-listed.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : brand.logoEmoji ? (
          <span className="text-lg leading-none">{brand.logoEmoji}</span>
        ) : (
          <Smartphone className="size-4.5 text-primary" />
        )}
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        {brand.name}
      </span>
    </Link>
  );
}
