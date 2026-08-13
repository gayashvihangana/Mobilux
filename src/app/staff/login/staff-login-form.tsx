"use client";

import { useActionState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
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
    // The demo buttons sit OUTSIDE this form — each is its own <form>, and
    // nesting forms is invalid HTML. See the note in the customer login form.
    <div className="space-y-5">
      {DEMO_MODE ? (
        <DemoLoginButtons
          action={staffLogin}
          roles={["owner", "staff"]}
          otherDoor={{ href: "/login", label: "See the customer's side" }}
        />
      ) : null}

      <form action={formAction} className="space-y-5">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      {state?.error ? (
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
    </div>
  );
}
