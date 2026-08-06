"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
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
  const [, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="email" value={account.email} />
      <input type="hidden" name="password" value={account.password} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Continue as {account.label}
      </Button>
    </form>
  );
}

export function DemoLoginButtons({
  action,
  roles,
}: {
  action: LoginAction;
  roles: DemoRole[];
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
    </div>
  );
}
