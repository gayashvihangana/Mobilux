"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { DemoLoginButtons } from "@/components/demo-login-buttons";
import { staffLogin } from "@/lib/actions/auth";
import { DEMO_MODE } from "@/lib/config";

export function StaffLoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(staffLogin, null);

  return (
    <form action={formAction} className="space-y-5">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      {DEMO_MODE ? (
        <DemoLoginButtons action={staffLogin} roles={["owner", "staff"]} />
      ) : null}

      {state?.wrongEntrance === "customer" ? (
        // Their password was right — they are just a customer at the staff
        // door. Say so plainly instead of "invalid email or password", which
        // would send them round in circles.
        <div className="space-y-3 rounded-xl border border-info/30 bg-info/10 px-4 py-3.5 text-sm">
          <div className="flex items-start gap-2.5">
            <UserRound className="mt-0.5 size-4 shrink-0 text-info" />
            <div>
              <p className="font-semibold">That&apos;s a customer account</p>
              <p className="mt-0.5 text-muted-foreground">
                This entrance is for the shop team. Sign in on the customer
                page to see your repairs.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/login">Go to customer sign-in</Link>
          </Button>
        </div>
      ) : state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@theshop.lk"
          autoComplete="email"
          required
          className="h-11"
        />
        <FieldError errors={state?.fieldErrors?.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="h-11"
        />
        <FieldError errors={state?.fieldErrors?.password} />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
