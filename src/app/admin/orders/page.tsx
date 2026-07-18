import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatLKR } from "@/lib/utils";
import { CancelOrderButton, FulfillOrderButton } from "./order-actions";

export const metadata: Metadata = {
  title: "Orders",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  const openCount = orders.filter(
    (o) => o.status === "PENDING" || o.status === "PAID",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Shop orders
        </h1>
        <p className="mt-1 text-muted-foreground">
          {openCount} open order{openCount === 1 ? "" : "s"} of {orders.length}{" "}
          total.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <ShoppingBag className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 font-semibold">No orders yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Customer orders from the shop will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{order.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.user.email}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-55">
                    <p className="truncate text-sm">
                      {order.items
                        .map((i) => `${i.quantity} × ${i.product.name}`)
                        .join(", ")}
                    </p>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatLKR(order.total.toString())}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {order.status === "PAID" ? (
                        <FulfillOrderButton orderId={order.id} />
                      ) : null}
                      {order.status === "PENDING" || order.status === "PAID" ? (
                        <CancelOrderButton orderId={order.id} />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
