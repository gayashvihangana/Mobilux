"use client";

import { useEffect, useRef } from "react";

// Drop-in draft saver for server-action forms. React 19 auto-resets an
// uncontrolled form once its action runs, so on a validation error the user
// loses everything they typed. This component mirrors the form's fields to
// localStorage as they type and restores them after an error, clearing the
// draft on success. Place it as a child of the <form> and pass the action
// state as `signal`.
//
// Skipped by design: passwords, file inputs, hidden/submit fields, and
// <select>s (their own defaults are authoritative).

// Any action-state object; we only read `success` (truthily) off it.
type Signal = Record<string, unknown> | null | undefined;

const SKIP_INPUT_TYPES = new Set([
  "password",
  "file",
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "checkbox",
  "radio",
]);

function isEditable(
  el: Element,
): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    if (!el.name) return false;
    return !SKIP_INPUT_TYPES.has(el.type);
  }
  return false;
}

function collect(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    if (isEditable(el) && el.name && el.value) out[el.name] = el.value;
  }
  return out;
}

// Set a value the way React expects (native setter + input event) so both
// controlled and uncontrolled fields update.
function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function restore(form: HTMLFormElement, data: Record<string, string>) {
  for (const [name, value] of Object.entries(data)) {
    if (!value) continue;
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (isEditable(el) && el.value !== value) setValue(el, value);
    }
  }
}

export function FormAutosave({
  storageKey,
  signal,
}: {
  storageKey: string;
  signal?: Signal;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const submitting = useRef(false);
  const key = `mbx-draft:${storageKey}`;

  // Restore on mount + keep the draft in sync while typing.
  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    try {
      const raw = localStorage.getItem(key);
      if (raw) restore(form, JSON.parse(raw));
    } catch {
      /* ignore corrupt/unavailable storage */
    }

    let timer: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(collect(form)));
        } catch {
          /* ignore */
        }
      }, 300);
    };
    const onSubmit = () => {
      submitting.current = true;
      try {
        localStorage.setItem(key, JSON.stringify(collect(form)));
      } catch {
        /* ignore */
      }
    };

    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", onSubmit);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
      form.removeEventListener("submit", onSubmit);
      // Unmounting while a submit is in flight means the action redirected
      // on success — the entry is done, so drop the draft.
      if (submitting.current) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    };
  }, [key]);

  // React to the action finishing: clear on success, refill on error (React
  // has just auto-reset the form).
  useEffect(() => {
    if (!signal) return;
    const form = anchor.current?.closest("form");
    if (!form) return;
    submitting.current = false;
    if (signal.success) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    } else {
      try {
        const raw = localStorage.getItem(key);
        if (raw) restore(form, JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, [signal, key]);

  return <span ref={anchor} hidden aria-hidden="true" />;
}
