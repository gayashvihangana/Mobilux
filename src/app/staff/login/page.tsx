import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { getShopInfo } from "@/lib/settings";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StaffLoginForm } from "./staff-login-form";

// Not for search engines, and not linked from anywhere on the public site.
// This is not a security control — the URL is guessable and the guards behind
// it are what actually matter — but there is no reason to advertise the shop's
// back door to every crawler and credential-stuffing list.
export const metadata: Metadata = {
  title: "Staff sign-in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl }, shop] = await Promise.all([
    searchParams,
    getShopInfo(),
  ]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div
        className="glow-primary absolute -top-40 left-1/2 h-100 w-150 -translate-x-1/2 rounded-full blur-[110px]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <Logo
          brand={{
            name: shop.name,
            logoUrl: shop.logoUrl,
            logoEmoji: shop.logoEmoji,
          }}
          href="/"
        />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to site
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-105">
          <Card className="glass border-border/60 shadow-2xl shadow-primary/5">
            <CardHeader className="text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-primary/30 bg-primary/10">
                <Wrench className="size-5 text-primary" />
              </span>
              <CardTitle className="font-display mt-3 text-2xl">
                Staff sign-in
              </CardTitle>
              <CardDescription>
                For the {shop.name} team. Customers sign in{" "}
                <Link href="/login" className="text-primary hover:underline">
                  here
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffLoginForm callbackUrl={callbackUrl} />
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Accounts are created by the shop owner. Lost your password? Ask them
            to reset it — there is no self-service reset for staff accounts.
          </p>
        </div>
      </main>
    </div>
  );
}
