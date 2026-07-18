import type { Metadata } from "next";
import Image from "next/image";
import { Package, Smartphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatLKR } from "@/lib/utils";
import {
  DeleteProductButton,
  PhonesVisibilityToggle,
  ProductDialog,
} from "./product-forms";

export const metadata: Metadata = {
  title: "Products",
};

export default async function AdminProductsPage() {
  const [products, showPhones] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    }),
    phonesVisible(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Products
          </h1>
          <p className="mt-1 text-muted-foreground">
            {products.length} product{products.length === 1 ? "" : "s"} in the
            catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PhonesVisibilityToggle initial={showPhones} />
          <ProductDialog />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Shown</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No products yet — add your first accessory or phone.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const Icon =
                  product.category === "PHONE" ? Smartphone : Package;
                const image = product.images[0];
                const shownInShop =
                  product.visible &&
                  (product.category !== "PHONE" || showPhones);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/60">
                          {image ? (
                            <Image
                              src={image}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid size-full place-items-center">
                              <Icon className="size-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <p className="max-w-60 truncate font-medium">
                          {product.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category === "PHONE" ? "Phone" : "Accessory"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatLKR(product.price.toString())}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          product.stock === 0 && "text-destructive",
                          product.stock > 0 &&
                            product.stock <= 3 &&
                            "text-warning",
                        )}
                      >
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          shownInShop
                            ? "border-success/30 bg-success/15 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            shownInShop ? "bg-success" : "bg-muted-foreground",
                          )}
                        />
                        {shownInShop
                          ? "Live"
                          : product.visible
                            ? "Hidden (phones off)"
                            : "Hidden"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ProductDialog product={product} />
                        <DeleteProductButton
                          productId={product.id}
                          name={product.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
