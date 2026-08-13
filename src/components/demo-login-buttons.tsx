"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo-accounts";
import type { AuthFormState } from "@/lib/actions/auth";

type LoginAction = (
  prev: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

// Each account is its own tiny form bound to the real sign-in action, with
// hidden credentials instead of typed ones — the button IS the credential,
// there's no new sign-in path to secure. `login`/`staffLogin` reject the
// wrong entrance exactly as they would for a typed-in password, so a
// customer-role button on the staff door (or vice versa) can't be offered by
// mistake without also failing to sign in.
function OneClickLogin({ action, role }: { action: LoginAction; role: DemoRole }) {
  const account = DEMO_ACCOUNTS[role];
  // The state is rendered, not discarded. It used to be thrown away, which
  // meant a refused sign-in — most often the login rate limiter, since these
  // buttons invite repeated clicking — produced no feedback at all and the
  // button looked broken. A one-click button that can fail silently is worse
  // than a form, because there is nothing for the visitor to re-check.
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="email" value={account.email} />
      <input type="hidden" name="password" value={account.password} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Continue as {account.label}
      </Button>
      {state?.error ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function DemoLoginButtons({
  action,
  roles,
  otherDoor,
}: {
  action: LoginAction;
  roles: DemoRole[];
  /**
   * Points a demo visitor at the other side of the product.
   *
   * **Demo only, deliberately.** A real shop's sign-in page must not
   * advertise where its back office is — that is the whole reason
   * `/staff/login` is unlinked and `noindex`, and staff do not need it
   * anyway now that either door signs them in. But a buyer landing on the
   * demo's customer login has no way of knowing the owner's dashboard and
   * technician view exist, and the back office is the part actually being
   * sold. So it is shown here and nowhere else.
   */
  otherDoor?: { href: string; label: string };
}) {
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <p className="text-center text-xs font-medium text-muted-foreground">
        Demo instance — skip the form
      </p>
      <div className="space-y-2">
        {roles.map((role) => (
          <OneClickLogin key={role} action={action} role={role} />
        ))}
      </div>
      {otherDoor ? (
        <Link
          href={otherDoor.href}
          className="flex items-center justify-center gap-1 pt-0.5 text-xs font-medium text-primary transition-colors hover:underline"
        >
          {otherDoor.label}
          <ArrowRight className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
