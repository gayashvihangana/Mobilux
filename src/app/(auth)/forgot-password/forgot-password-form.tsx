"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import {
  requestPasswordReset,
  resetPassword,
} from "@/lib/actions/password-reset";

export function ForgotPasswordForm() {
  const [requestState, requestAction, requesting] = useActionState(
    requestPasswordReset,
    null,
  );
  const [resetState, resetAction, resetting] = useActionState(
    resetPassword,
    null,
  );

  // Step 2 once a code has been sent; resetPassword keeps sent/email on error.
  const state = resetState ?? requestState;
  const email = state?.email;
  const codeSent = !!state?.sent && !!email;

  if (!codeSent) {
    return (
      <form action={requestAction} className="space-y-5">
        {state?.error ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            {state.error}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="h-11"
          />
          <FieldError errors={state?.fieldErrors?.email} />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={requesting}>
          {requesting ? <Loader2 className="size-4 animate-spin" /> : null}
          {requesting ? "Sending code…" : "Email me a code"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to log in
          </Link>
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        <MailCheck className="size-4 shrink-0" />
        If an account exists for {email}, a 6-digit code is on its way. It
        expires in 10 minutes.
      </div>
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <form action={resetAction} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        <div className="space-y-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            required
            className="h-11 text-center font-mono text-lg tracking-[0.4em]"
          />
          <FieldError errors={state?.fieldErrors?.code} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            className="h-11"
          />
          <FieldError errors={state?.fieldErrors?.newPassword} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            className="h-11"
          />
          <FieldError errors={state?.fieldErrors?.confirmPassword} />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={resetting}>
          {resetting ? <Loader2 className="size-4 animate-spin" /> : null}
          {resetting ? "Resetting…" : "Reset password"}
        </Button>
      </form>
      <form action={requestAction}>
        <input type="hidden" name="email" value={email} />
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get it?{" "}
          <button
            type="submit"
            disabled={requesting}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {requesting ? "Sending…" : "Send a new code"}
          </button>
        </p>
      </form>
    </div>
  );
}
