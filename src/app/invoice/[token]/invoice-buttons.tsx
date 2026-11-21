"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Copy" beside a bank detail; says "Copied" for a moment after a tap. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* the value is on screen to copy by hand */
        }
      }}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition-colors",
        copied ? "bg-success/15 text-success" : "bg-primary/10 text-primary hover:bg-primary/15",
      )}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Saves the bill as a PDF file, with no new page or print box. */
export function PdfButton({
  href,
  label,
  variant = "secondary",
  className,
}: {
  href: string;
  label: string;
  variant?: "secondary" | "white";
  className?: string;
}) {
  return (
    <Button
      asChild
      size="lg"
      variant="secondary"
      className={cn(
        variant === "white" && "bg-white text-neutral-900 hover:bg-white/90",
        className,
      )}
    >
      <a href={href} download>
        <Download /> {label}
      </a>
    </Button>
  );
}
