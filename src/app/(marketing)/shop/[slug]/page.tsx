import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Package, ShieldCheck, Smartphone } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn, formatLKR } from "@/lib/utils";
import { BuyForm } from "./buy-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  return { title: product ? product.name : "Product" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, session, showPhones] = await Promise.all([
    prisma.product.findUnique({ where: { slug } }),
    auth(),
    phonesVisible(),
  ]);

  if (!product || !product.visible) notFound();
  if (product.category === "PHONE" && !showPhones) notFound();

  const Icon = product.category === "PHONE" ? Smartphone : Package;
  const image = product.images[0];
  const out = product.stock === 0;
  const low = !out && product.stock <= 3;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-20">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to shop
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-muted/60">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 90vw, 540px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="grid size-full place-items-center">
              <Icon className="size-16 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            {product.category === "PHONE" ? "Pre-owned phone" : "Accessory"}
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="font-display mt-4 text-3xl font-bold">
            {formatLKR(product.price.toString())}
          </p>

          <p
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 text-sm",
              out
                ? "text-destructive"
                : low
                  ? "text-warning"
                  : "text-success",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                out ? "bg-destructive" : low ? "bg-warning" : "bg-success",
              )}
            />
            {out
              ? "Out of stock"
              : low
                ? `Only ${product.stock} left`
                : "In stock"}
          </p>

          <p className="mt-5 leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-8">
            {out ? (
              <Button size="lg" className="h-11 sm:px-8" disabled>
                Out of stock
              </Button>
            ) : session?.user ? (
              <BuyForm productId={product.id} stock={product.stock} />
            ) : (
              <div className="space-y-3">
                <Button asChild size="lg" className="h-11 sm:px-8">
                  <Link href={`/login?callbackUrl=/shop/${product.slug}`}>
                    Sign in to buy
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  You&apos;ll be back here right after signing in.
                </p>
              </div>
            )}
          </div>

          <div className="mt-10 space-y-2.5 border-t border-border pt-6 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Checked and guaranteed by our technicians
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Pay by bank transfer, collect at the shop
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
