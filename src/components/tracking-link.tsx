"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The link a walk-in customer gets instead of an account. Handing this over
// (WhatsApp, SMS, or the QR on their printed bill) is the whole point of the
// token: the customer sees their repair without the shop having to create
// them a login, and nobody can reach anyone else's repair by counting up
// from MBX-0001.
export function TrackingLink({
  url,
  ticketNumber,
  className,
}: {
  url: string;
  ticketNumber: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is blocked outside a secure context (plain http on a
      // shop's LAN, for one), so say so rather than failing silently.
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/40 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Link2 className="size-4 shrink-0 text-primary" />
        <p className="text-sm font-medium">Customer tracking link</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Send this to a customer with no account — it opens {ticketNumber}{" "}
        without a sign-in. Anyone holding the link can see the repair&apos;s
        progress, so share it with the customer only.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
          {url}
        </code>
        <Button
          type="button"
          size="sm"
          variant={copied ? "outline" : "default"}
          onClick={() => copy(url, "Tracking link copied.")}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            <span className="sr-only">Open tracking page</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
