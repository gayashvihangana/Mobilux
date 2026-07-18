import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import type { ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Quality phone accessories and hand-checked pre-owned phones — cases, chargers, audio and more, priced in LKR.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const showPhones = await phonesVisible();

  const filter: ProductCategory | undefined =
    category === "accessories"
      ? "ACCESSORY"
      : category === "phones" && showPhones
        ? "PHONE"
        : undefined;

  const products = await prisma.product.findMany({
    where: {
      visible: true,
      ...(filter
        ? { category: filter }
        : showPhones
          ? {}
          : { category: "ACCESSORY" }),
    },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const tabs = [
    { value: undefined, label: "All", href: "/shop" },
    { value: "accessories", label: "Accessories", href: "/shop?category=accessories" },
    ...(showPhones
      ? [{ value: "phones", label: "Phones", href: "/shop?category=phones" }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold tracking-widest text-primary uppercase">
          Shop
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Accessories{showPhones ? " & phones" : ""} you can trust
        </h1>
        <p className="mt-3 text-muted-foreground">
          Every item is hand-checked by the same technicians who fix your
          devices. Pay by bank transfer and collect at the shop.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = category === tab.value || (!category && !tab.value);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary/40 bg-primary/15 font-medium text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {products.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card/50 p-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <PackageOpen className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 font-semibold">Nothing here yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            New stock is on the way — check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
