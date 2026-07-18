"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/field-error";
import {
  changePassword,
  updateProfile,
  type ProfileFormState,
} from "@/lib/actions/profile";

function useFormToast(state: ProfileFormState, message: string) {
  const last = useRef<ProfileFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) {
        toast.success(message);
      } else if (state?.error) {
        toast.error(state.error);
      }
    }
    last.current = state;
  }, [state, message]);
}

function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <TriangleAlert className="size-4 shrink-0" />
      {error}
    </div>
  );
}

export function ProfileDetailsForm({
  name,
  email,
  phone,
  avatarUrl,
}: {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, null);
  useFormToast(state, "Profile updated.");

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBanner error={state?.error} />

      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-16 border border-border">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Label htmlFor="avatar">Profile photo</Label>
          <Input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="cursor-pointer file:text-primary"
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP. Leave empty to keep your current photo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={name} required />
          <FieldError errors={state?.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            placeholder="07X XXX XXXX"
          />
          <FieldError errors={state?.fieldErrors?.phone} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
        <p className="text-xs text-muted-foreground">
          Your email is your sign-in and can&apos;t be changed here — contact us
          if you need to move your account.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);
  useFormToast(state, "Password changed.");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <ErrorBanner error={state?.error} />

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError errors={state?.fieldErrors?.currentPassword} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError errors={state?.fieldErrors?.newPassword} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError errors={state?.fieldErrors?.confirmPassword} />
        </div>
      </div>

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Change password
      </Button>
    </form>
  );
}
