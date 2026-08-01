import type { Metadata } from "next";
import { MessageCircle, Search, SearchX } from "lucide-react";
import { SHOP, WHATSAPP_ENABLED, whatsappLink } from "@/lib/config";
import { findByNumberAndPhone } from "@/lib/track";
import { limitByIp } from "@/lib/rate-limit";
import { TrackResult } from "@/components/track-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Track your repair",
  description:
    "Check the live status of your repair — enter your ticket number, no sign-in needed.",
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; p?: string }>;
}) {
  const { t, p } = await searchParams;
  const query = t?.trim() ?? "";
  const phone = p?.trim() ?? "";
  const submitted = query.length > 0 || phone.length > 0;

  // Ticket numbers are sequential, so without a throttle this form is a
  // scraper's front door even with the phone check in place.
  const throttle = submitted ? await limitByIp("track") : { ok: true };
  const ticket =
    submitted && throttle.ok
      ? await findByNumberAndPhone(query, phone)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-20">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-widest text-primary uppercase">
          Repair tracker
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Where is my device?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Scanning the QR code on your bill opens your repair straight away. No
          bill to hand? Enter your ticket number and the last 4 digits of your
          phone number.
        </p>
      </div>

      <form
        action="/track"
        className="mx-auto mt-8 grid max-w-md gap-4 sm:grid-cols-[1fr_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="t">Ticket number</Label>
          <Input
            id="t"
            type="text"
            name="t"
            defaultValue={query}
            placeholder="MBX-0044"
            autoComplete="off"
            className="h-11 font-mono uppercase placeholder:normal-case"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p">Phone (last 4)</Label>
          <Input
            id="p"
            type="text"
            name="p"
            defaultValue={phone}
            placeholder="5678"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            className="h-11 w-full font-mono sm:w-28"
            required
          />
        </div>
        <Button type="submit" size="lg" className="h-11 sm:col-span-2">
          <Search className="size-4" /> Track my repair
        </Button>
      </form>

      {submitted && !ticket ? (
        // Deliberately one message for every failure — wrong number, wrong
        // phone, or a walk-in ticket with no phone on file. Distinguishing
        // them would turn this form back into a way to discover which ticket
        // numbers exist.
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-warning/25 bg-warning/10">
            <SearchX className="size-5 text-warning" />
          </span>
          <h2 className="mt-4 font-semibold">
            We couldn&apos;t find that repair
          </h2>
          <p className="mx-auto mt-1 text-sm text-muted-foreground">
            Check the ticket number and phone digits on your receipt. If you
            came in without an account, use the tracking link we sent you — or
            message us and we&apos;ll find it.
          </p>
          {WHATSAPP_ENABLED ? (
            <Button asChild variant="outline" size="sm" className="mt-5">
              <a
                href={whatsappLink(
                  `Hi ${SHOP.name}! I can't find my repair ticket "${query}" on the tracker. Can you help?`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" /> Chat on WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      {ticket ? <TrackResult ticket={ticket} /> : null}
    </div>
  );
}
