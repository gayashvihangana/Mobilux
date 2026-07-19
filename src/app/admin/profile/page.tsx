import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import {
  ChangePasswordForm,
  ProfileDetailsForm,
} from "@/app/(app)/profile/profile-forms";

export const metadata: Metadata = {
  title: "My profile",
};

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, avatarUrl: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          My profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          Update your admin account details, photo and password.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Profile details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your name and photo appear across the admin panel.
        </p>
        <Separator className="my-5" />
        <ProfileDetailsForm
          name={user.name}
          email={user.email}
          phone={user.phone}
          avatarUrl={user.avatarUrl}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use at least 8 characters. You&apos;ll stay signed in after changing
          it.
        </p>
        <Separator className="my-5" />
        <ChangePasswordForm />
      </section>
    </div>
  );
}
