"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
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

// Admins can CREATE a customer login (email + password). They deliberately
// cannot edit a customer's name/phone/password afterwards, or delete the
// account — the only ongoing management action is block / unblock below.
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

// Block or unblock a customer's login. Blocking stops them signing in;
// unblocking also clears any pending unblock request.
export async function setCustomerBlocked(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  if (!(await requireAdmin())) return { error: "Not authorized." };

  const id = formData.get("id");
  const blocked = formData.get("blocked") === "true";
  if (typeof id !== "string" || !id) return { error: "Customer not found." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== "CUSTOMER") {
    return { error: "Customer not found." };
  }

  await prisma.user.update({
    where: { id },
    data: { blocked, unblockRequested: false },
  });

  revalidateCustomers();
  return { success: true };
}
