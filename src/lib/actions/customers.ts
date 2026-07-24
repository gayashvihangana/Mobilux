"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CustomerFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
} | null;

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session : null;
}

function revalidateCustomers() {
  revalidatePath("/admin/customers");
  revalidatePath("/admin");
}

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+94|0)?[0-9]{9}$/, "Enter a valid Sri Lankan phone number")
  .optional()
  .or(z.literal(""));

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  revalidateCustomers();
  return { success: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});

export async function updateCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, email, phone, password } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== "CUSTOMER") {
    return { error: "Customer not found." };
  }

  const normalizedEmail = email.toLowerCase();
  const data: Prisma.UserUpdateInput = {
    name,
    email: normalizedEmail,
    phone: phone || null,
  };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  try {
    await prisma.user.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Another account already uses that email." };
    }
    throw e;
  }

  revalidateCustomers();
  return { success: true };
}

export async function deleteCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Customer not found." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== "CUSTOMER") {
    return { error: "Customer not found." };
  }

  // Repair history is preserved — tickets keep their record and just detach
  // from the deleted account (customerId → null via onDelete: SetNull).
  await prisma.user.delete({ where: { id } });

  revalidateCustomers();
  return { success: true };
}
