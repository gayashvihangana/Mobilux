"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionAdmin, actionUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/config";
import { formatLKR } from "@/lib/utils";

export type OrderFormState = {
  error?: string;
  success?: boolean;
} | null;

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const user = await actionUser();
  if (!user) redirect("/login");

  const parsed = z
    .object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().min(1).max(10),
    })
    .safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
    });
  if (!parsed.success) return { error: "Invalid order." };

  const { productId, quantity } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.visible) return { error: "Product not available." };
  if (product.category === "PHONE" && !(await phonesVisible())) {
    return { error: "Product not available." };
  }
  if (product.stock < quantity) {
    return {
      error:
        product.stock === 0
          ? "This product is out of stock."
          : `Only ${product.stock} left in stock.`,
    };
  }

  const total = Number(product.price) * quantity;

  const order = await prisma.$transaction(async (tx) => {
    // Guarded decrement prevents overselling on concurrent orders
    const updated = await tx.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (updated.count === 0) {
      throw new Error("OUT_OF_STOCK");
    }
    const created = await tx.order.create({
      data: {
        userId: user.id,
        orderNumber: `TMP-${crypto.randomUUID()}`,
        total,
        items: {
          create: [{ productId, quantity, unitPrice: product.price }],
        },
      },
    });
    const withNumber = await tx.order.update({
      where: { id: created.id },
      data: { orderNumber: `ORD-${String(created.seq).padStart(4, "0")}` },
    });
    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: `New order ${withNumber.orderNumber}`,
          body: `${quantity} × ${product.name} — ${formatLKR(total)}`,
          href: "/admin/orders",
        })),
      });
    }
    return withNumber;
  }).catch((e) => {
    if (e instanceof Error && e.message === "OUT_OF_STOCK") return null;
    throw e;
  });

  if (!order) return { error: "This product just sold out." };

  revalidatePath("/shop");
  revalidatePath("/admin/orders");
  redirect(`/orders/${order.id}?created=1`);
}

export async function updateOrderStatus(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  if (!(await actionAdmin())) return { error: "Not authorized." };

  const parsed = z
    .object({
      orderId: z.string().min(1),
      status: z.enum(["FULFILLED", "CANCELLED"]),
    })
    .safeParse({
      orderId: formData.get("orderId"),
      status: formData.get("status"),
    });
  if (!parsed.success) return { error: "Invalid request." };

  const { orderId, status } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  if (!order) return { error: "Order not found." };
  if (order.status === "FULFILLED" || order.status === "CANCELLED") {
    return { error: "This order is already closed." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status } });
    if (status === "CANCELLED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    await tx.notification.create({
      data: {
        userId: order.userId,
        title: `Order ${order.orderNumber} ${status === "FULFILLED" ? "fulfilled" : "cancelled"}`,
        body:
          status === "FULFILLED"
            ? "Your order is ready — collect it at the shop or contact us for delivery."
            : "Your order was cancelled. Contact us if this looks wrong.",
        href: `/orders/${orderId}`,
      },
    });
  });

  await sendEmail({
    to: order.user.email,
    subject: `Order ${order.orderNumber} ${status === "FULFILLED" ? "is ready" : "was cancelled"}`,
    heading:
      status === "FULFILLED" ? "Your order is ready 🎉" : "Order cancelled",
    lines: [
      `Hi ${order.user.name},`,
      status === "FULFILLED"
        ? `Order ${order.orderNumber} is ready — collect it at the shop or contact us for delivery.`
        : `Order ${order.orderNumber} was cancelled. Contact us if this looks wrong.`,
    ],
    cta: { label: "View order", url: `${SITE_URL}/orders/${orderId}` },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/shop");
  return { success: true };
}
