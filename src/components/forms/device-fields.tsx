"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { deviceSuggestions } from "@/lib/actions/devices";
import {
  DEVICE_CATALOG,
  matchOptions,
  mergeDevices,
  normaliseDevice,
} from "@/lib/devices";

// Brand and Model boxes that suggest as you type, like a shop's search box:
// type "A" and Apple, Asus and the rest drop down; pick one or keep typing.
// Anything not in the list is still accepted ("Add “Galaxy S27”"), and once a
// repair is saved with it, it is suggested next time. With no brand chosen,
// picking a model also fills in its brand.

type Catalog = Record<string, string[]>;

// One fetch of the shop's own entries per page load, shared by every form.
let shopDevices: Promise<Catalog> | null = null;
function loadCatalog(): Promise<Catalog> {
  shopDevices ??= deviceSuggestions()
    .then(mergeDevices)
    .catch(() => DEVICE_CATALOG);
  return shopDevices;
}

type InputConfig = {
  id: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  invalid?: boolean;
};

export function DeviceFields({
  defaultBrand = "",
  defaultModel = "",
  brand,
  model,
  children,
}: {
  defaultBrand?: string;
  defaultModel?: string;
  brand: InputConfig;
  model: InputConfig;
  /** Lays the two boxes out with the form's own labels and errors. */
  children: (fields: { brand: ReactNode; model: ReactNode }) => ReactNode;
}) {
  const [catalog, setCatalog] = useState<Catalog>(DEVICE_CATALOG);
  const [brandValue, setBrandValue] = useState(defaultBrand);
  const [modelValue, setModelValue] = useState(defaultModel);

  useEffect(() => {
    let live = true;
    loadCatalog().then((c) => live && setCatalog(c));
    return () => {
      live = false;
    };
  }, []);

  const brands = useMemo(() => Object.keys(catalog), [catalog]);
  const brandKey = useMemo(
    () => brands.find((b) => normaliseDevice(b) === normaliseDevice(brandValue)),
    [brands, brandValue],
  );
  // Which brand each model belongs to, for "pick a model, get its brand".
  const modelBrand = useMemo(() => {
    const map = new Map<string, string>();
    for (const [b, models] of Object.entries(catalog)) {
      for (const m of models) map.set(m, b);
    }
    return map;
  }, [catalog]);
  const models = useMemo(() => {
    if (brandKey) return catalog[brandKey];
    if (brandValue.trim()) return [];
    return [...modelBrand.keys()];
  }, [brandKey, brandValue, catalog, modelBrand]);

  return children({
    brand: (
      <Combobox
        name="brand"
        config={brand}
        value={brandValue}
        onChange={setBrandValue}
        options={brands}
        otherLabel="Other brand"
        onPick={(picked) => {
          // A different brand makes the model a guess: clear it.
          if (normaliseDevice(picked) !== normaliseDevice(brandValue)) setModelValue("");
        }}
      />
    ),
    model: (
      <Combobox
        name="model"
        config={model}
        value={modelValue}
        onChange={setModelValue}
        options={models}
        otherLabel="Other model"
        describe={brandKey ? undefined : (m) => modelBrand.get(m)}
        onPick={(picked) => {
          const owner = modelBrand.get(picked);
          if (!brandValue.trim() && owner) setBrandValue(owner);
        }}
      />
    ),
  });
}

function Combobox({
  name,
  config,
  value,
  onChange,
  options,
  otherLabel,
  onPick,
  describe,
}: {
  name: string;
  config: InputConfig;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  otherLabel: string;
  onPick?: (value: string) => void;
  /** Small grey text after an option, e.g. the brand of a model. */
  describe?: (option: string) => string | undefined;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [typing, setTyping] = useState(false);

  // While the box still shows a picked value, list everything; once the
  // person types, narrow the list to what matches.
  const matches = useMemo(
    () => matchOptions(options, typing ? value : ""),
    [options, value, typing],
  );
  const typed = value.trim();
  const exact = options.some((o) => normaliseDevice(o) === normaliseDevice(typed));

  type Item = { kind: "option" | "add" | "other"; value: string };
  const items: Item[] = [
    ...matches.map((m) => ({ kind: "option" as const, value: m })),
    ...(typing && typed && !exact ? [{ kind: "add" as const, value: typed }] : []),
    ...(!typing || !typed ? [{ kind: "other" as const, value: "" }] : []),
  ];

  function choose(item: Item) {
    if (item.kind === "other") {
      onChange("");
      setTyping(true);
      setOpen(false);
      inputRef.current?.focus();
      return;
    }
    onChange(item.value);
    onPick?.(item.value);
    setTyping(false);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={config.id}
        name={name}
        value={value}
        required={config.required}
        placeholder={config.placeholder}
        className={config.className}
        aria-invalid={config.invalid || undefined}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onFocus={() => {
          setOpen(true);
          setTyping(false);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setTyping(true);
          setOpen(true);
          setActive(e.target.value.trim() ? 0 : -1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {open && items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={name === "brand" ? "Brands" : "Models"}
          // Keep focus in the box while a mouse or finger picks an option.
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "absolute top-full z-50 mt-1.5 max-h-72 w-max max-w-[min(22rem,calc(100vw-2rem))] min-w-full overflow-y-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            // Model sits in the right-hand column: grow leftwards.
            name === "model" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => (
            <li
              key={`${item.kind}-${item.value}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => choose(item)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-[15px]",
                i === active && "bg-accent",
                item.kind !== "option" && "font-semibold text-primary",
              )}
            >
              {item.kind === "option" ? (
                <>
                  <span className="min-w-0 truncate">{item.value}</span>
                  {describe?.(item.value) ? (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {describe(item.value)}
                    </span>
                  ) : null}
                </>
              ) : item.kind === "add" ? (
                <>
                  <Plus className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">Add “{item.value}”</span>
                </>
              ) : (
                <span>{otherLabel}: type it in</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
