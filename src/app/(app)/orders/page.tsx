import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatDate, formatLKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My orders",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            My orders
          </h1>
          <p className="mt-1 text-muted-foreground">
            Accessories and phones you&apos;ve ordered from the shop.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/shop">
            <ShoppingBag className="size-4" /> Browse shop
          </Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <ShoppingBag className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 font-semibold">No orders yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Browse our accessories and phones — anything you order shows up
            here.
          </p>
          <Button asChild className="mt-5">
            <Link href="/shop">Visit the shop</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {order.items
                      .map((i) => `${i.quantity} × ${i.product.name}`)
                      .join(", ")}
                  </p>
                  <p className="font-display mt-1 text-lg font-bold">
                    {formatLKR(order.total.toString())}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{order.orderNumber}</span>
                <span className="flex items-center gap-1">
                  {formatDate(order.createdAt)}
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
