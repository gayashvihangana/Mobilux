import Link from "next/link";
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
      className={cn("group flex min-w-0 items-center gap-2.5", className)}
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/mobilux-mark.png"
            alt=""
            className="size-full object-cover"
          />
        )}
      </span>
      {/* Truncates rather than overflowing: the name is whatever the shop
          typed into Settings, and a long one used to run straight out of the
          header bar and over the buttons on a phone. */}
      <span className="font-display truncate text-lg font-bold tracking-tight sm:text-xl">
        {brand.name}
      </span>
    </Link>
  );
}
