import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Package, Smartphone } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatLKR } from "@/lib/utils";
import { OrderPaymentCard } from "./order-payment-card";

export const metadata: Metadata = {
  title: "Order details",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [{ id }, { created }] = await Promise.all([params, searchParams]);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order || order.userId !== session.user.id) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>

      {created && order.status === "PENDING" ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          Order placed and stock reserved! Complete the bank transfer below to
          confirm it.
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            {order.orderNumber} · Placed {formatDate(order.createdAt)}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Your order
          </h1>
        </div>
        <OrderStatusBadge status={order.status} className="px-3 py-1.5 text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => {
              const Icon =
                item.product.category === "PHONE" ? Smartphone : Package;
              const image = item.product.images[0];
              return (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/60">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <Icon className="size-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop/${item.product.slug}`}
                      className="truncate font-medium hover:text-primary"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {formatLKR(item.unitPrice.toString())}
                    </p>
                  </div>
                  <p className="font-medium whitespace-nowrap">
                    {formatLKR(Number(item.unitPrice) * item.quantity)}
                  </p>
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-xl font-bold">
                {formatLKR(order.total.toString())}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <OrderPaymentCard
            order={order}
            latestPayment={order.payments[0] ?? null}
          />
        </div>
      </div>
    </div>
  );
}
