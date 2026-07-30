import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, Search } from "lucide-react";
import type { Prisma, ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import { FilterMenu } from "@/components/filter-menu";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Quality phone accessories and hand-checked pre-owned phones — cases, chargers, audio and more, priced in LKR.",
};

const SORTS = [
  { value: undefined, label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const;

function shopHref(params: { category?: string; q?: string; sort?: string }) {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  const qs = search.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const { category, q, sort } = await searchParams;
  const query = q?.trim() || undefined;
  const showPhones = await phonesVisible();

  const filter: ProductCategory | undefined =
    category === "accessories"
      ? "ACCESSORY"
      : category === "phones" && showPhones
        ? "PHONE"
        : undefined;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "price-asc"
      ? [{ price: "asc" }]
      : sort === "price-desc"
        ? [{ price: "desc" }]
        : [{ category: "asc" }, { createdAt: "desc" }];

  const products = await prisma.product.findMany({
    where: {
      visible: true,
      ...(filter
        ? { category: filter }
        : showPhones
          ? {}
          : { category: "ACCESSORY" }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy,
  });

  const tabs: { value: string | undefined; label: string }[] = [
    { value: undefined, label: "All products" },
    { value: "accessories", label: "Accessories" },
    ...(showPhones ? [{ value: "phones", label: "Phones" }] : []),
  ];

  // Counts beside each category, respecting the same search the list uses.
  const searchWhere: Prisma.ProductWhereInput = {
    visible: true,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [accessoryCount, phoneCount] = await Promise.all([
    prisma.product.count({ where: { ...searchWhere, category: "ACCESSORY" } }),
    showPhones
      ? prisma.product.count({ where: { ...searchWhere, category: "PHONE" } })
      : Promise.resolve(0),
  ]);
  const counts: Record<string, number> = {
    all: accessoryCount + phoneCount,
    accessories: accessoryCount,
    phones: phoneCount,
  };

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

      <form action="/shop" className="mt-8 flex max-w-md gap-2">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search cases, chargers, phones…"
          aria-label="Search products"
        />
        <Button type="submit" variant="outline" className="shrink-0">
          <Search className="size-4" />
          <span className="sr-only sm:not-sr-only">Search</span>
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <FilterMenu
          basePath="/shop"
          params={{ category, q: query, sort }}
          label="All products"
          groups={[
            {
              param: "category",
              label: "Category",
              defaultValue: "all",
              value: category ?? "all",
              options: tabs.map((tab) => ({
                value: tab.value ?? "all",
                label: tab.label,
                count: counts[tab.value ?? "all"],
              })),
            },
          ]}
        />
        <FilterMenu
          basePath="/shop"
          params={{ category, q: query, sort }}
          label="Newest"
          icon="sort"
          groups={[
            {
              param: "sort",
              label: "Sort by",
              defaultValue: "newest",
              value: sort ?? "newest",
              options: SORTS.map((option) => ({
                value: option.value ?? "newest",
                label: option.label,
              })),
            },
          ]}
        />
      </div>

      {query ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {products.length === 0
            ? "No results"
            : `${products.length} result${products.length === 1 ? "" : "s"}`}{" "}
          for <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
          {" · "}
          <Link
            href={shopHref({ category, sort })}
            className="text-primary hover:underline"
          >
            Clear search
          </Link>
        </p>
      ) : null}

      {products.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card/50 p-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <PackageOpen className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 font-semibold">
            {query ? "Nothing matches your search" : "Nothing here yet"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {query
              ? "Try a different keyword, or browse all products."
              : "New stock is on the way — check back soon."}
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
