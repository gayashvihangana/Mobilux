import Image from "next/image";
import Link from "next/link";
import type { Product } from "@prisma/client";
import { cn, formatLKR } from "@/lib/utils";

// Branded fallback art for products without photos (SVGs skip the
// next/image optimizer, hence the plain <img>).
export function productPlaceholder(category: Product["category"]) {
  return category === "PHONE"
    ? "/placeholders/phone.svg"
    : "/placeholders/accessory.svg";
}

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const out = product.stock === 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="relative aspect-square overflow-hidden bg-muted/60">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- static SVG placeholder
          <img
            src={productPlaceholder(product.category)}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {out ? (
          <span className="absolute top-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            Out of stock
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          {product.category === "PHONE" ? "Phone" : "Accessory"}
        </p>
        <h3 className="mt-1 truncate font-semibold">{product.name}</h3>
        <p
          className={cn(
            "font-display mt-1.5 text-lg font-bold",
            out && "text-muted-foreground",
          )}
        >
          {formatLKR(product.price.toString())}
        </p>
      </div>
    </Link>
  );
}
