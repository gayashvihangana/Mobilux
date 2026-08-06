"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { actionPermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { saveUploads } from "@/lib/uploads";
import { PHONES_VISIBLE_KEY, setSetting } from "@/lib/settings";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  category: z.enum(["ACCESSORY", "PHONE"]),
  description: z.string().trim().min(10, "Describe the product (min 10 characters)"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  stock: z.coerce.number().int().min(0, "Stock can't be negative"),
  visible: z.coerce.boolean(),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Catalogue and stock are counter work.
async function allowed() {
  return !!(await actionPermission("product:write"));
}

function revalidateShop() {
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    visible: formData.get("visible") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File);
  const uploaded = await saveUploads(images, "products");
  if (uploaded.error) return { error: uploaded.error };

  let slug = slugify(parsed.data.name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  await prisma.product.create({
    data: { ...parsed.data, slug, images: uploaded.urls ?? [] },
  });

  revalidateShop();
  return { success: true };
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "Invalid product." };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    visible: formData.get("visible") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const uploaded = await saveUploads(images, "products");
  if (uploaded.error) return { error: uploaded.error };

  await prisma.product.update({
    where: { id },
    data: {
      ...parsed.data,
      // New images replace old ones only when provided
      ...(uploaded.urls && uploaded.urls.length > 0
        ? { images: uploaded.urls }
        : {}),
    },
  });

  revalidateShop();
  return { success: true };
}

export async function deleteProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (!(await allowed())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "Invalid product." };

  try {
    await prisma.product.delete({ where: { id } });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      return {
        error:
          "This product has orders and can't be deleted — hide it instead.",
      };
    }
    throw e;
  }

  revalidateShop();
  return { success: true };
}

export async function setPhonesVisibility(visible: boolean) {
  if (!(await allowed())) return;
  await setSetting(PHONES_VISIBLE_KEY, visible ? "true" : "false");
  revalidateShop();
}
