"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Star,
  Trash2,
  TriangleAlert,
  Upload,
  X,
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
  addBankAccount,
  deleteBankAccount,
  makePrimaryBankAccount,
  updateBankAccount,
  updateShopInfo,
  type SettingsFormState,
} from "@/lib/actions/settings";
import { ACCENT_PRESETS, type BankAccount, type ShopInfo } from "@/lib/settings";

function useFormToast(
  state: SettingsFormState,
  message: string,
  onSuccess?: () => void,
) {
  const last = useRef<SettingsFormState>(null);
  useEffect(() => {
    if (state !== last.current) {
      if (state?.success) {
        toast.success(message);
        onSuccess?.();
      } else if (state?.error) {
        toast.error(state.error);
      }
    }
    last.current = state;
  }, [state, message, onSuccess]);
}

export function BankAccountDialog({ account }: { account?: BankAccount }) {
  const [open, setOpen] = useState(false);
  const editing = !!account;
  const [state, formAction, pending] = useActionState(
    editing ? updateBankAccount : addBankAccount,
    null,
  );
  useFormToast(state, editing ? "Account updated." : "Account added.", () =>
    setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Edit account</span>
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Add account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={account.id} /> : null}
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit bank account" : "Add bank account"}
            </DialogTitle>
            <DialogDescription>
              Accounts customers can pay into. The default account shows on
              unpaid bills.
            </DialogDescription>
          </DialogHeader>

          {state?.error ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                name="bankName"
                defaultValue={account?.bankName ?? ""}
                placeholder="e.g. Commercial Bank"
                required
              />
              <FieldError errors={state?.fieldErrors?.bankName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                name="branch"
                defaultValue={account?.branch ?? ""}
                placeholder="e.g. Kandy"
              />
              <FieldError errors={state?.fieldErrors?.branch} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                name="accountName"
                defaultValue={account?.accountName ?? ""}
                placeholder="e.g. Your Shop (Pvt) Ltd"
                required
              />
              <FieldError errors={state?.fieldErrors?.accountName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                defaultValue={account?.accountNumber ?? ""}
                placeholder="e.g. 1000234567"
                required
              />
              <FieldError errors={state?.fieldErrors?.accountNumber} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MakePrimaryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await makePrimaryBankAccount(id);
          if (result?.error) toast.error(result.error);
          else toast.success("Default account updated.");
        })
      }
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Star className="size-3.5" />
      )}
      Make default
    </Button>
  );
}

export function DeleteBankAccountButton({ account }: { account: BankAccount }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteBankAccount, null);
  useFormToast(state, "Account removed.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete account</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={account.id} />
          <DialogHeader>
            <DialogTitle>Remove this account?</DialogTitle>
            <DialogDescription>
              {account.bankName} · {account.accountNumber} will no longer be
              available to pay into. This won&apos;t change bills already issued.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Remove account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Read-only summary until the admin taps Edit — the same "show what's set,
// edit on demand" shape the bank accounts list uses, so the settings page
// reads as a summary rather than a wall of inputs.
// The logo mark, at whatever size the surrounding preview needs.
function BrandMark({
  logoUrl,
  emoji,
  className,
  emojiClassName,
}: {
  logoUrl: string;
  emoji: string;
  className?: string;
  emojiClassName?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-primary/30 bg-primary/15 ${className ?? "size-9"}`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : emoji ? (
        <span className={emojiClassName ?? "text-lg leading-none"}>{emoji}</span>
      ) : (
        <Smartphone className="size-4.5 text-primary" />
      )}
    </span>
  );
}

/**
 * What the shop is about to look like, updating as the form is typed into.
 * `brand-scope` re-derives the theme's branded tokens from the hue below it
 * (see globals.css), so this preview genuinely re-colours without touching
 * the page around it.
 */
function BrandPreview({
  name,
  tagline,
  logoUrl,
  emoji,
  hue,
}: {
  name: string;
  tagline: string;
  logoUrl: string;
  emoji: string;
  hue: number;
}) {
  const displayName = name.trim() || "Your Shop";

  return (
    <div
      className="brand-scope space-y-3 rounded-xl border border-border bg-muted/30 p-4"
      style={{ "--brand-hue": hue } as React.CSSProperties}
    >
      <p className="text-xs font-medium text-muted-foreground">Preview</p>

      {/* Header, as customers see it */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <BrandMark logoUrl={logoUrl} emoji={emoji} />
          <span className="font-display truncate text-lg font-bold tracking-tight">
            {displayName}
          </span>
        </span>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Track repair
        </span>
      </div>

      {/* Bill letterhead — always light, because paper is */}
      <div className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-800">
        <p
          className="text-xl font-bold tracking-tight text-neutral-900"
          style={{
            fontFamily:
              "var(--font-newsreader), Georgia, 'Times New Roman', serif",
          }}
        >
          {displayName}
        </p>
        {tagline.trim() ? (
          <p className="text-[11px] text-neutral-500 italic">{tagline}</p>
        ) : null}
        <p className="mt-1 text-[10px] text-neutral-400">
          Invoice · the printed bill uses this name
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground">
        The tab title, emails and the public tracker follow the same name.
      </p>
    </div>
  );
}

export function ShopInfoForm({ info }: { info: ShopInfo }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateShopInfo, null);
  useFormToast(state, "Shop details saved.", () => setEditing(false));

  // Live-preview state. Seeded from the saved values every time the form is
  // opened, so cancelling and reopening doesn't show stale edits.
  const [name, setName] = useState(info.name);
  const [tagline, setTagline] = useState(info.tagline);
  const [emoji, setEmoji] = useState(info.logoEmoji);
  const [hue, setHue] = useState(info.accentHue);
  const [logoUrl, setLogoUrl] = useState(info.logoUrl);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Object URLs for the not-yet-uploaded file, revoked when replaced.
  const previewObjectUrl = useRef<string | null>(null);

  function openEditor() {
    setName(info.name);
    setTagline(info.tagline);
    setEmoji(info.logoEmoji);
    setHue(info.accentHue);
    setLogoUrl(info.logoUrl);
    setLogoRemoved(false);
    setEditing(true);
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    if (!file) {
      previewObjectUrl.current = null;
      setLogoUrl(logoRemoved ? "" : info.logoUrl);
      return;
    }
    const url = URL.createObjectURL(file);
    previewObjectUrl.current = url;
    setLogoUrl(url);
    setLogoRemoved(false);
  }

  function clearLogo() {
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
    if (fileRef.current) fileRef.current.value = "";
    setLogoUrl("");
    setLogoRemoved(true);
  }

  if (!editing) {
    const rows: { label: string; value: string; wide?: boolean }[] = [
      { label: "Shop name", value: info.name },
      { label: "Tagline", value: info.tagline },
      { label: "Phone", value: info.phone },
      { label: "Email", value: info.email },
      { label: "WhatsApp", value: info.whatsapp },
      {
        label: "Brand colour",
        value:
          ACCENT_PRESETS.find((p) => p.hue === info.accentHue)?.label ??
          `Custom (${info.accentHue}°)`,
      },
      { label: "Address / location", value: info.address, wide: true },
      { label: "Opening hours", value: info.hours, wide: true },
    ];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BrandMark
            logoUrl={info.logoUrl}
            emoji={info.logoEmoji}
            className="size-11"
            emojiClassName="text-xl leading-none"
          />
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-bold tracking-tight">
              {info.name}
            </p>
            {info.tagline ? (
              <p className="truncate text-sm text-muted-foreground">
                {info.tagline}
              </p>
            ) : null}
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className={row.wide ? "sm:col-span-2" : undefined}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 font-medium">{row.value || "—"}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" variant="outline" onClick={openEditor}>
          <Pencil className="size-4" /> Edit shop details
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Shop name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FieldError errors={state?.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            name="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={info.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" defaultValue={info.email} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={info.whatsapp}
            inputMode="numeric"
            placeholder="e.g. 94712345678"
          />
          <p className="text-xs text-muted-foreground">
            Digits only, with the country code and no leading zero. Leave blank
            to hide every &ldquo;chat on WhatsApp&rdquo; button.
          </p>
          <FieldError errors={state?.fieldErrors?.whatsapp} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address / location</Label>
          <Input
            id="address"
            name="address"
            defaultValue={info.address}
            placeholder="e.g. 123 Galle Rd, Colombo 03"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="hours">Opening hours</Label>
          <Input
            id="hours"
            name="hours"
            defaultValue={info.hours}
            placeholder="e.g. Mon–Sat, 9:00 AM – 7:00 PM"
          />
          <p className="text-xs text-muted-foreground">
            Shown on the bill and in the &ldquo;ready for pickup&rdquo; message
            customers receive.
          </p>
        </div>
      </div>

      {/* ── Look ─────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">Logo &amp; colour</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo image</Label>
            <div className="flex items-center gap-3">
              <BrandMark
                logoUrl={logoUrl}
                emoji={emoji}
                className="size-11"
                emojiClassName="text-xl leading-none"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {logoUrl ? "Replace" : "Upload"}
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearLogo}
                  >
                    <X className="size-4" /> Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <input
              ref={fileRef}
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPickLogo}
            />
            {/* Tells the action to clear a saved logo — a file input that was
                left empty is indistinguishable from "don't change it". */}
            {logoRemoved ? (
              <input type="hidden" name="removeLogo" value="1" />
            ) : null}
            <p className="text-xs text-muted-foreground">
              Square works best. PNG, JPG or WebP, up to 4 MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoEmoji">Or an emoji</Label>
            <Input
              id="logoEmoji"
              name="logoEmoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🔧"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Used when there&apos;s no logo image. Leave both blank for the
              default phone icon.
            </p>
            <FieldError errors={state?.fieldErrors?.logoEmoji} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Brand colour</Label>
          <input type="hidden" name="accentHue" value={hue} />
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const selected = preset.hue === hue;
              return (
                <button
                  key={preset.hue}
                  type="button"
                  onClick={() => setHue(preset.hue)}
                  aria-pressed={selected}
                  title={preset.label}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "border-foreground/40 bg-accent"
                      : "border-border hover:bg-accent/60"
                  }`}
                >
                  <span
                    className="size-4 rounded-full"
                    style={{
                      background: `oklch(0.6 0.2 ${preset.hue})`,
                    }}
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Only the hue changes — brightness stays tuned for light and dark
            mode, so buttons and text keep their contrast either way.
          </p>
        </div>

        <BrandPreview
          name={name}
          tagline={tagline}
          logoUrl={logoUrl}
          emoji={emoji}
          hue={hue}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save shop details
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
