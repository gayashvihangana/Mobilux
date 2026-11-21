"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSettings, type SettingsFormState } from "@/lib/actions/settings";

// One settings section as a form. It remembers what the fields held when the
// section opened, and while anything differs a dark bar at the bottom says
// what changed, with Discard and Save (the approved Settings sample).

type Ctx = {
  /** Call after changing a field React controls (switches, hidden inputs). */
  changed: () => void;
  state: SettingsFormState;
};

const SettingsFormContext = createContext<Ctx>({ changed: () => {}, state: null });

export function useSettingsForm() {
  return useContext(SettingsFormContext);
}

function snapshot(form: HTMLFormElement): Map<string, string> {
  const values = new Map<string, string>();
  for (const [key, value] of new FormData(form).entries()) {
    const text = value instanceof File ? (value.size > 0 ? `file:${value.name}` : "") : value;
    values.set(key, (values.get(key) ?? "") + text);
  }
  return values;
}

/** The label people see for a field: data-label, or its <label for>. */
function labelFor(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  const el = field instanceof RadioNodeList ? (field[0] as HTMLElement) : (field as HTMLElement | null);
  if (!el) return name;
  if (el.dataset.label) return el.dataset.label;
  const id = el.getAttribute("id");
  const label = id ? form.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
  return label?.textContent?.trim() || name;
}

export function SettingsForm({ children }: { children: ReactNode }) {
  const [state, formAction, saving] = useActionState(saveSettings, null);
  const [starting, startTransition] = useTransition();
  const pending = saving || starting;
  const form = useRef<HTMLFormElement>(null);
  const initial = useRef<Map<string, string>>(new Map());
  // Discard and a successful save remount the fields, so each starts again
  // from what the server holds.
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState<string[]>([]);

  const changed = useCallback(() => {
    // After React has rendered the change into the DOM.
    requestAnimationFrame(() => {
      const el = form.current;
      if (!el) return;
      const now = snapshot(el);
      const names = new Set([...now.keys(), ...initial.current.keys()]);
      const different = [...names].filter(
        (name) => (now.get(name) ?? "") !== (initial.current.get(name) ?? ""),
      );
      setDirty(different.map((name) => labelFor(el, name)));
    });
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (form.current) initial.current = snapshot(form.current);
      setDirty([]);
    });
  }, [version]);

  const last = useRef<SettingsFormState>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state?.success) {
      toast.success("Settings saved.");
      setVersion((v) => v + 1);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const count = dirty.length;
  const errors = Object.values(state?.fieldErrors ?? {}).flat();

  return (
    <SettingsFormContext.Provider value={{ changed, state }}>
      <form
        ref={form}
        // Submitted by hand, not through the action prop: React clears a form
        // after its action runs, which would wipe typing when a check fails.
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
        onInput={changed}
        onChange={changed}
        className="space-y-4"
      >
        {errors.length > 0 ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Please fix the fields marked below.
          </div>
        ) : null}
        <div key={version} className="space-y-4">
          {children}
        </div>

        {count > 0 ? (
          <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center gap-2 rounded-[22px] bg-ink p-3 text-ink-foreground sm:inset-x-6 lg:right-8 lg:bottom-6 lg:left-[calc(16rem+2rem)]">
            <p className="min-w-0 flex-1 px-2 text-sm font-semibold">
              {count === 1
                ? `1 unsaved change: ${dirty[0]}`
                : `${count} unsaved changes`}
            </p>
            <Button
              type="button"
              className="bg-ink-foreground/15 text-ink-foreground hover:bg-ink-foreground/25"
              onClick={() => setVersion((v) => v + 1)}
              disabled={pending}
            >
              Discard
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        ) : null}
      </form>
    </SettingsFormContext.Provider>
  );
}

/** A field's own error, under it. */
export function SettingsFieldError({ name }: { name: string }) {
  const { state } = useSettingsForm();
  const errors = state?.fieldErrors?.[name];
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}
