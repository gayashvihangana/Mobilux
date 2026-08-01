import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, SearchX } from "lucide-react";
import { SHOP, WHATSAPP_ENABLED, whatsappLink } from "@/lib/config";
import { findByToken } from "@/lib/track";
import { limitByIp } from "@/lib/rate-limit";
import { TrackResult } from "@/components/track-result";
import { Button } from "@/components/ui/button";

// A tracking link is a credential. Keep it out of search results and out of
// the Referer header of anything the page links to.
export const metadata: Metadata = {
  title: "Your repair",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TrackByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // The token is unguessable, so this is not really brute-forceable — the
  // limit is here so a flood of bad links can't be used to hammer the
  // database for free.
  const throttle = await limitByIp("track");
  const ticket = throttle.ok ? await findByToken(token) : null;

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-32 pb-20">
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-warning/25 bg-warning/10">
            <SearchX className="size-5 text-warning" />
          </span>
          <h1 className="mt-4 font-semibold">This tracking link doesn&apos;t work</h1>
          <p className="mx-auto mt-1 text-sm text-muted-foreground">
            It may have been mistyped or cut short when it was copied. Message
            us with your ticket number and we&apos;ll send you a fresh link.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {WHATSAPP_ENABLED ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={whatsappLink(
                    `Hi ${SHOP.name}! My repair tracking link isn't working.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" /> Chat on WhatsApp
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="ghost">
              <Link href="/track">Look up by ticket number</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-20">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-widest text-primary uppercase">
          Repair tracker
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Where is my device?
        </h1>
      </div>
      <TrackResult ticket={ticket} />
    </div>
  );
}
