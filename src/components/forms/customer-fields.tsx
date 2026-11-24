"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { customerChoices, type CustomerChoice } from "@/lib/actions/customer-options";

// The Customer and Phone boxes on the new-repair forms. Type a name and
// registered customers drop down (matched by name, email or phone); pick one
// to link the repair to their account, which also fills in their phone. Or
// just keep typing: any name is fine for a walk-in. Phone is optional.

// One fetch per page load, shared by every form on the page.
let loaded: Promise<CustomerChoice[]> | null = null;
function loadCustomers() {
  loaded ??= customerChoices().catch(() => []);
  return loaded;
}

type InputConfig = { id: string; placeholder?: string; className?: string; invalid?: boolean };

export function CustomerFields({
  name,
  phone,
  children,
}: {
  name: InputConfig;
  phone: InputConfig;
  /** Lays the boxes out with the form's own labels and errors. */
  children: (fields: { customer: ReactNode; phone: ReactNode }) => ReactNode;
}) {
  const listId = useId();
  const [customers, setCustomers] = useState<CustomerChoice[]>([]);
  const [nameValue, setNameValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [linked, setLinked] = useState<CustomerChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    loadCustomers().then((c) => live && setCustomers(c));
    return () => {
      live = false;
    };
  }, []);

  const matches = useMemo(() => {
    const q = nameValue.trim().toLowerCase();
    if (!q || linked) return [];
    const digits = q.replace(/\D/g, "");
    const scored = customers.flatMap((c) => {
      const n = c.name.toLowerCase();
      let score = -1;
      if (n.startsWith(q)) score = 0;
      else if (n.split(/\s+/).some((w) => w.startsWith(q))) score = 1;
      else if (q.length > 1 && (n.includes(q) || c.email.toLowerCase().includes(q))) score = 2;
      else if (digits.length >= 3 && c.phone?.replace(/\D/g, "").includes(digits)) score = 2;
      return score < 0 ? [] : [{ c, score }];
    });
    return scored
      .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
      .slice(0, 8)
      .map((s) => s.c);
  }, [customers, nameValue, linked]);

  const pick = (c: CustomerChoice) => {
    setLinked(c);
    setNameValue(c.name);
    if (c.phone && !phoneValue.trim()) setPhoneValue(c.phone);
    setOpen(false);
  };
  const unlink = () => {
    setLinked(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const showList = open && matches.length > 0;

  const customer = (
    <div className="relative">
      <input type="hidden" name="customerId" value={linked?.id ?? "none"} />
      <div className="relative">
      <Input
        ref={inputRef}
        id={name.id}
        name="customerName"
        value={nameValue}
        placeholder={name.placeholder}
        className={cn(linked && "pr-10", name.className)}
        aria-invalid={name.invalid || undefined}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setNameValue(e.target.value);
          if (linked) setLinked(null);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(matches.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {linked ? (
        <BadgeCheck aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-success" />
      ) : null}
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Registered customers"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 z-50 mt-1.5 max-h-72 w-full min-w-64 overflow-y-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <li role="presentation" className="px-3 pt-1.5 pb-1 text-xs font-bold text-muted-foreground">
            Registered customers
          </li>
          {matches.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => pick(c)}
              onMouseEnter={() => setActive(i)}
              className={cn("flex min-h-11 cursor-pointer flex-col justify-center rounded-xl px-3 py-1.5", i === active && "bg-accent")}
            >
              <span className="text-[15px] font-semibold">{c.name}</span>
              <span className="truncate text-xs text-muted-foreground">{c.phone ?? c.email}</span>
            </li>
          ))}
          <li role="presentation" className="px-3 pt-1 pb-1.5 text-xs text-muted-foreground">
            Not here? Keep typing to add a walk-in.
          </li>
        </ul>
      ) : null}

      {linked ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            Linked to their account <span className="font-semibold text-foreground">{linked.email}</span>
          </span>
          <button
            type="button"
            onClick={unlink}
            className="inline-flex min-h-8 items-center gap-1 font-bold text-primary hover:underline"
          >
            <X className="size-3.5" /> Not them
          </button>
        </p>
      ) : null}
    </div>
  );

  const phoneBox = (
    <Input
      id={phone.id}
      name="customerPhone"
      type="tel"
      inputMode="tel"
      autoComplete="off"
      value={phoneValue}
      onChange={(e) => setPhoneValue(e.target.value)}
      placeholder={phone.placeholder}
      className={phone.className}
      aria-invalid={phone.invalid || undefined}
    />
  );

  return children({ customer, phone: phoneBox });
}
