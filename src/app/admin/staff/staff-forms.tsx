"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Copy,
  KeyRound,
  Loader2,
  Plus,
  TriangleAlert,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import {
  createStaff,
  resetStaffPassword,
  setStaffActive,
  type StaffFormState,
} from "@/lib/actions/staff";

// Staff accounts have no self-service password reset, so the owner reads the
// password out. Showing it once, with a copy button, beats them inventing
// "password123" because retyping it into WhatsApp is annoying.
function suggestPassword() {
  const words = ["bench", "solder", "screen", "anvil", "copper", "quartz", "ember", "pivot"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 90 + 10);
  return `${pick()}-${pick()}-${n}`;
}

function useFormToast(
  state: StaffFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<StaffFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) {
        toast.success(message);
        onSuccess?.();
      } else if (state?.error) {
        toast.error(state.error);
      }
      last.current = state;
    }
  });
}

function PasswordHandoff({ password }: { password: string }) {
  return (
    <div className="space-y-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
      <p className="text-sm font-semibold text-success">
        Give them this password
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-background/60 px-3 py-2 font-mono text-sm">
          {password}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(password);
            toast.success("Copied");
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        It won&apos;t be shown again. They sign in at /staff/login.
      </p>
    </div>
  );
}

export function StaffDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(suggestPassword);
  const [state, formAction, pending] = useActionState(createStaff, null);
  useFormToast(state, "Technician account created.");

  // Keep the dialog open on success so the password can actually be read.
  useEffect(() => {
    if (open) return;
    setPassword(suggestPassword());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Add technician
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a technician</DialogTitle>
          <DialogDescription>
            They&apos;ll be able to log repairs, update status and issue bills —
            but not see reports, change settings or delete anything.
          </DialogDescription>
        </DialogHeader>

        {state?.tempPassword ? (
          <div className="space-y-4">
            <PasswordHandoff password={state.tempPassword} />
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="size-4 shrink-0" />
                {state.error}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input id="staff-name" name="name" required />
              <FieldError errors={state?.fieldErrors?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Work email</Label>
              <Input id="staff-email" name="email" type="email" required />
              <FieldError errors={state?.fieldErrors?.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone (optional)</Label>
              <Input id="staff-phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="staff-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(suggestPassword())}
                >
                  New
                </Button>
              </div>
              <FieldError errors={state?.fieldErrors?.password} />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create account
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(suggestPassword);
  const [state, formAction, pending] = useActionState(resetStaffPassword, null);
  useFormToast(state, "Password changed — they're signed out everywhere.");

  useEffect(() => {
    if (!open) setPassword(suggestPassword());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title={`Reset ${name}'s password`}>
          <KeyRound className="size-4" />
          <span className="sr-only">Reset password</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset {name}&apos;s password</DialogTitle>
          <DialogDescription>
            Staff accounts have no self-service reset. Set a new password and
            read it out — this also signs them out on every device.
          </DialogDescription>
        </DialogHeader>

        {state?.tempPassword ? (
          <div className="space-y-4">
            <PasswordHandoff password={state.tempPassword} />
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-2">
              <Label htmlFor={`pw-${id}`}>New password</Label>
              <div className="flex gap-2">
                <Input
                  id={`pw-${id}`}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(suggestPassword())}
                >
                  New
                </Button>
              </div>
              <FieldError errors={state?.fieldErrors?.password} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Set password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ActiveToggle({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const res = await setStaffActive(id, !active);
      if (res?.error) toast.error(res.error);
      else if (active) toast.success(`${name} signed out and deactivated.`);
      else toast.success(`${name} can sign in again.`);
    });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={active ? `Deactivate ${name}` : `Reactivate ${name}`}
      className={active ? "text-destructive hover:text-destructive" : "text-success"}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : active ? (
        <UserX className="size-4" />
      ) : (
        <UserCheck className="size-4" />
      )}
      <span className="hidden sm:inline">
        {active ? "Deactivate" : "Reactivate"}
      </span>
    </Button>
  );
}
