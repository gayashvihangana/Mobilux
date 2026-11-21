"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCENT_PRESETS,
  fillMessage,
  formatTime,
  WEEKDAYS,
  weekHoursSummary,
  type DayHours,
} from "@/lib/settings-shared";
import { cn } from "@/lib/utils";
import { SettingsFieldError, useSettingsForm } from "./settings-form";

/** A white card with a title, like the sample's "Shop profile" block. */
export function Panel({
  title,
  note,
  children,
  action,
}: {
  title: string;
  note?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {note ? <p className="mt-0.5 text-sm text-muted-foreground">{note}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  hint,
  className,
  children,
}: {
  name: string;
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={`set-${name}`}>{label}</Label>
      {children}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <SettingsFieldError name={name} />
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  hint,
  className,
  ...rest
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  hint?: ReactNode;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue">) {
  return (
    <Field name={name} label={label} hint={hint} className={className}>
      <Input id={`set-${name}`} name={name} defaultValue={defaultValue} {...rest} />
    </Field>
  );
}

// ── Shop profile ─────────────────────────────────────────────────

export function ProfileFields({
  info,
}: {
  info: {
    name: string;
    tagline: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    logoUrl: string;
    logoEmoji: string;
  };
}) {
  const { changed } = useSettingsForm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState(info.logoUrl);
  const [removed, setRemoved] = useState(false);

  useEffect(() => changed(), [removed, changed]);

  return (
    <Panel title="Shop profile" note="Shown on the website, on bills and on tracking pages.">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[22px] bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo || "/brand/mobilux-mark.png"}
            alt="Shop logo"
            className="size-full object-cover"
          />
        </span>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ink" onClick={() => fileRef.current?.click()}>
              Change logo
            </Button>
            {logo ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  setLogo("");
                  setRemoved(true);
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">PNG or JPG, square, at least 512 px</p>
        </div>
        <input
          ref={fileRef}
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          data-label="Logo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLogo(URL.createObjectURL(file));
              setRemoved(false);
            }
          }}
        />
        {removed ? <input type="hidden" name="removeLogo" value="1" data-label="Logo" /> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TextField name="name" label="Shop name" defaultValue={info.name} required />
        <TextField name="tagline" label="Tagline" defaultValue={info.tagline} />
        <TextField name="phone" label="Phone" defaultValue={info.phone} type="tel" />
        <TextField
          name="whatsapp"
          label="WhatsApp"
          defaultValue={info.whatsapp}
          inputMode="numeric"
          placeholder="94712345678"
          hint="With 94, no leading 0. Blank hides WhatsApp buttons."
        />
        <TextField name="email" label="Email" defaultValue={info.email} type="email" />
        <TextField
          name="address"
          label="Address"
          defaultValue={info.address}
          className="sm:col-span-2 xl:col-span-3"
          placeholder="12 Temple Road, Pannipitiya"
          hint="The last part is the town shown to customers."
        />
      </div>
      <input type="hidden" name="logoEmoji" value={info.logoEmoji} />
    </Panel>
  );
}

export function HoursFields({ week: saved }: { week: DayHours[] }) {
  const { changed } = useSettingsForm();
  const [week, setWeek] = useState(saved);
  useEffect(() => changed(), [week, changed]);

  const set = (i: number, patch: Partial<DayHours>) =>
    setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <Panel
      title="Opening hours"
      note={`The website shows "Open now" or "Closed" from these. Shown as: ${weekHoursSummary(week)}`}
    >
      <input type="hidden" name="weekHours" value={JSON.stringify(week)} data-label="Opening hours" />
      <ul className="divide-y divide-border">
        {week.map((day, i) => (
          <li
            key={WEEKDAYS[i]}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[7rem_1fr_auto]"
          >
            <span className="font-bold">{WEEKDAYS[i]}</span>
            <span className="col-span-2 row-start-2 flex items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
              {day.open ? (
                <>
                  <Input
                    type="time"
                    aria-label={`${WEEKDAYS[i]} opens`}
                    value={day.from}
                    onChange={(e) => set(i, { from: e.target.value })}
                    className="min-w-0 flex-1 px-3 sm:w-36 sm:flex-none"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    aria-label={`${WEEKDAYS[i]} closes`}
                    value={day.to}
                    onChange={(e) => set(i, { to: e.target.value })}
                    className="min-w-0 flex-1 px-3 sm:w-36 sm:flex-none"
                  />
                  <span className="sr-only">
                    {formatTime(day.from)} to {formatTime(day.to)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Closed</span>
              )}
            </span>
            <Switch
              size="lg"
              className="col-start-2 row-start-1 sm:col-start-3"
              checked={day.open}
              onCheckedChange={(open) => set(i, { open })}
              aria-label={`Open on ${WEEKDAYS[i]}`}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── Repairs ──────────────────────────────────────────────────────

export function RepairsFields({
  warrantyDays,
  ticketPrefix,
  commonProblems,
}: {
  warrantyDays: number;
  ticketPrefix: string;
  commonProblems: string[];
}) {
  return (
    <Panel title="Repairs" note="How new repairs are numbered and booked in.">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="warrantyDays"
          label="Standard warranty (days)"
          defaultValue={warrantyDays}
          type="number"
          inputMode="numeric"
          min={0}
          max={3650}
          hint="Shown on the homepage and in the bill's warranty terms."
        />
        <TextField
          name="ticketPrefix"
          label="Repair number prefix"
          defaultValue={ticketPrefix}
          maxLength={6}
          autoCapitalize="characters"
          hint={`New repairs are numbered ${ticketPrefix}-001, ${ticketPrefix}-002… Changing it starts again at 001.`}
        />
        <Field
          name="commonProblems"
          label="Common problems"
          className="sm:col-span-2"
          hint="One per line. They appear as one-tap buttons on the new repair form."
        >
          <Textarea
            id="set-commonProblems"
            name="commonProblems"
            rows={5}
            defaultValue={commonProblems.join("\n")}
          />
        </Field>
      </div>
    </Panel>
  );
}

// ── Bills ────────────────────────────────────────────────────────

export function BillFields({ billMessage, shopName }: { billMessage: string; shopName: string }) {
  return (
    <Panel title="Bill text" note="The thank-you line printed at the bottom of every bill.">
      <Field
        name="billMessage"
        label="Thank-you line"
        hint="Leave blank for the standard line."
      >
        <Textarea
          id="set-billMessage"
          name="billMessage"
          rows={2}
          maxLength={300}
          defaultValue={billMessage}
          placeholder={`Your device, in trusted hands — thank you for choosing ${shopName}.`}
        />
      </Field>
    </Panel>
  );
}

// ── Customer messages ────────────────────────────────────────────

const EXAMPLE = {
  name: "Nimal",
  device: "Galaxy A32",
  ticket: "REP-054",
  amount: "LKR 6,500",
  link: "https://…/track/…",
};

function MessageField({
  name,
  label,
  defaultValue,
  placeholders,
  shopName,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholders: string;
  shopName: string;
}) {
  const [text, setText] = useState(defaultValue);
  return (
    <Field
      name={name}
      label={label}
      hint={
        <>
          You can use {placeholders}.
          <span className="mt-2 block rounded-2xl bg-secondary px-4 py-3 text-foreground">
            {fillMessage(text, { ...EXAMPLE, shop: shopName })}
          </span>
        </>
      }
    >
      <Textarea
        id={`set-${name}`}
        name={name}
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </Field>
  );
}

export function MessageFields({
  msgReady,
  msgLink,
  shopName,
}: {
  msgReady: string;
  msgLink: string;
  shopName: string;
}) {
  return (
    <Panel
      title="Customer messages"
      note="The WhatsApp texts the app types for you. You can still edit each one before sending."
    >
      <div className="space-y-6">
        <MessageField
          name="msgReady"
          label="Ready for pickup (the Remind button)"
          defaultValue={msgReady}
          placeholders="{name}, {device}, {ticket}, {amount} and {shop}"
          shopName={shopName}
        />
        <MessageField
          name="msgLink"
          label="Tracking link (the Send link button)"
          defaultValue={msgLink}
          placeholders="{name}, {device}, {ticket}, {link} and {shop}"
          shopName={shopName}
        />
      </div>
    </Panel>
  );
}

// ── Appearance ───────────────────────────────────────────────────

export function AppearanceFields({ accentHue }: { accentHue: number }) {
  const { changed } = useSettingsForm();
  const [hue, setHue] = useState(accentHue);
  useEffect(() => changed(), [hue, changed]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "Same as device", icon: Monitor },
  ];

  return (
    <>
      <Panel title="Light or dark" note="Changes straight away, on this device only.">
        <div className="grid gap-2 sm:grid-cols-3">
          {themes.map(({ value, label, icon: Icon }) => {
            const selected = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={selected}
                className={cn(
                  "flex h-14 items-center gap-3 rounded-2xl px-4 font-bold transition-colors",
                  selected ? "bg-ink text-ink-foreground" : "bg-secondary hover:bg-accent",
                )}
              >
                <Icon className="size-5" /> {label}
                {selected ? <Check className="ml-auto size-5" /> : null}
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel title="Accent colour" note="The colour of main buttons, for everyone. Saved with the bar below.">
        <input type="hidden" name="accentHue" value={hue} data-label="Accent colour" />
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const selected = preset.hue === hue;
            return (
              <button
                key={preset.hue}
                type="button"
                onClick={() => setHue(preset.hue)}
                aria-pressed={selected}
                className={cn(
                  "flex h-12 items-center gap-2.5 rounded-2xl px-4 font-bold transition-colors",
                  selected ? "bg-ink text-ink-foreground" : "bg-secondary hover:bg-accent",
                )}
              >
                <span
                  className="size-5 rounded-full"
                  style={{ background: `oklch(0.55 0.22 ${preset.hue})` }}
                />
                {preset.label}
              </button>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
