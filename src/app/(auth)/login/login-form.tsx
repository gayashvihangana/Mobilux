"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, Loader2, TriangleAlert, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import { DemoLoginButtons } from "@/components/demo-login-buttons";
import { login, requestUnblock } from "@/lib/actions/auth";
import { DEMO_MODE } from "@/lib/config";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(login, null);
  const [requesting, startRequest] = useTransition();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    // Reset the "request sent" state whenever a fresh blocked result arrives.
    if (state?.blocked) setRequested(!!state.unblockRequested);
  }, [state]);

  const askUnblock = () => {
    if (!state?.blockedEmail) return;
    startRequest(async () => {
      const res = await requestUnblock(state.blockedEmail!);
      if (res.ok) {
        setRequested(true);
        toast.success(
          res.already
            ? "Your request is already with the shop."
            : "Unblock request sent to the shop.",
        );
      } else {
        toast.error("Couldn't send the request. Please contact the shop.");
      }
    });
  };

  return (
    <form action={formAction} className="space-y-5">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      {DEMO_MODE ? <DemoLoginButtons action={login} roles={["customer"]} /> : null}
      {state?.wrongEntrance === "staff" ? (
        // A shop account with the right password. The staff entrance isn't
        // advertised anywhere, so this is the one place it gets named — and
        // only to someone who has already proved they own the account.
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm">
          <div className="flex items-start gap-2.5">
            <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Use the staff entrance</p>
              <p className="mt-0.5 text-muted-foreground">
                This is the customer sign-in. Your account belongs to the shop
                team.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="w-full">
            <Link href="/staff/login">Go to staff sign-in</Link>
          </Button>
        </div>
      ) : state?.blocked ? (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive">
          <div className="flex items-start gap-2.5">
            <Ban className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Your account is blocked</p>
              <p className="mt-0.5 text-destructive/90">
                You can&apos;t log in right now. Request an unblock and the shop
                will review it.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="w-full"
            disabled={requesting || requested}
            onClick={askUnblock}
          >
            {requesting ? <Loader2 className="size-4 animate-spin" /> : null}
            {requested ? "Unblock request sent" : "Request unblock"}
          </Button>
        </div>
      ) : state?.error ? (
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Forgot password?
          </Link>
        </div>
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
        {pending ? "Logging in…" : "Log in"}
      </Button>
      {!DEMO_MODE ? (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      ) : null}
    </form>
  );
}
