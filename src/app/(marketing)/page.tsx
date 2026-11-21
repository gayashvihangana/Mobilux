import Link from "next/link";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { getShopInfo, shopWhatsappLink, type ShopInfo } from "@/lib/settings";
import { SITE_URL } from "@/lib/config";
import { SITE_IMAGES, type SiteImage } from "@/lib/site-images";
import { telHref } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/whatsapp";
import { TestimonialsSection } from "@/components/testimonials-section";
import { cn, jsonLdScript } from "@/lib/utils";

// Shown in the hero's small print until warranty length is a setting (step 6).
const WARRANTY = "30-day warranty";

/** "Pannipitiya" from "12 Temple Road, Pannipitiya" — the last part names the town. */
function townOf(address: string) {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // "Colombo 03"-style and "…, Sri Lanka" endings: skip the country.
  const useful = parts.filter((p) => !/^sri lanka$/i.test(p));
  return useful[useful.length - 1] ?? "";
}

// LocalBusiness rich-result data so Google shows shop info in search.
// Built per request from Settings — this is the shop's public identity, and
// publishing a stale name and address to Google is worse than most places a
// wrong name can appear.
function buildJsonLd(shop: ShopInfo, town: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: shop.name,
    url: SITE_URL,
    telephone: shop.phone,
    email: shop.email,
    address: {
      "@type": "PostalAddress",
      ...(town ? { addressLocality: town } : {}),
      addressCountry: "LK",
    },
    description: `Phone repair${
      town ? ` in ${town}` : ""
    } — chip-level board repair, screens, batteries and water damage, with a price before work starts and live repair tracking.`,
  };
}

export default async function HomePage() {
  const shop = await getShopInfo();
  const town = townOf(shop.address);
  const photoQuote = shopWhatsappLink(
    shop,
    "Hi! I'd like a price for a repair. Here is a photo of the problem:",
  );
  const chat = shopWhatsappLink(shop, `Hi ${shop.name}! I have a question.`);
  const directions = shop.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${shop.name}, ${shop.address}`,
      )}`
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildJsonLd(shop, town)) }}
      />

      <div className="mx-auto max-w-6xl space-y-4 px-4 pt-24 pb-16 sm:space-y-5 sm:pt-28">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid gap-4 sm:gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col justify-center rounded-[28px] bg-card p-6 sm:p-12">
            {town ? (
              <p className="self-start rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-bold text-primary">
                Phone repair in {town}
              </p>
            ) : null}
            <h1 className="font-display mt-5 text-[2.6rem] leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
              We fix the board, not just the screen.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Chip-level repair for phones other shops send back. You get a
              price before any work starts, and you can follow the repair from
              your own phone.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="ink" className="h-14 px-7">
                <a
                  href={photoQuote ?? (shop.phone ? telHref(shop.phone) : "/track")}
                  {...(photoQuote ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {photoQuote ? "Send a photo for a price" : "Call for a price"}
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-14 px-7">
                <Link href="/track">Track my repair</Link>
              </Button>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1.5 text-sm font-medium text-muted-foreground">
              {shop.hours ? <span>{shop.hours}</span> : null}
              {shop.phone ? (
                <a href={telHref(shop.phone)} className="hover:text-foreground">
                  {shop.phone}
                </a>
              ) : null}
              <span>{WARRANTY}</span>
            </p>
          </div>

          <HeroCard image={SITE_IMAGES.hero} />
        </section>

        {/* ── Services ─────────────────────────────────────────── */}
        <section id="services" className="scroll-mt-24">
          <h2 className="sr-only">What we repair</h2>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            <ServiceCard
              title="Chip-level board repair"
              note="No power, no charging, no signal"
              image={SITE_IMAGES.boardRepair}
              tileClass="bg-ink"
              art={<ChipArt />}
            />
            <ServiceCard
              title="Screens and batteries"
              note="Most done the same day"
              image={SITE_IMAGES.screens}
              tileClass="bg-primary/10"
              art={<CrackedPhoneArt />}
            />
            <ServiceCard
              title="Water damage"
              note="Bring it in switched off, fast"
              image={SITE_IMAGES.waterDamage}
              tileClass="bg-primary"
              art={<DropArt />}
            />
          </div>
        </section>

        {/* ── Find us ──────────────────────────────────────────── */}
        <section
          id="find-us"
          className="grid scroll-mt-24 gap-6 rounded-[28px] bg-card p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Find us
            </h2>
            {shop.address ? (
              <p className="flex items-start gap-2.5 text-base">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                {shop.address}
              </p>
            ) : null}
            {shop.hours ? (
              <p className="flex items-start gap-2.5 text-base">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
                {shop.hours}
              </p>
            ) : null}
            {shop.phone ? (
              <p className="flex items-start gap-2.5 text-base">
                <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
                {shop.phone}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            {shop.phone ? (
              <Button asChild size="lg" variant="ink">
                <a href={telHref(shop.phone)}>
                  <Phone /> Call
                </a>
              </Button>
            ) : null}
            {chat ? (
              <Button asChild size="lg">
                <a href={chat} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-5" /> WhatsApp
                </a>
              </Button>
            ) : null}
            {directions ? (
              <Button asChild size="lg" variant="secondary">
                <a href={directions} target="_blank" rel="noopener noreferrer">
                  <Navigation /> Directions
                </a>
              </Button>
            ) : null}
          </div>
        </section>
      </div>

      {/* Hidden until there are at least three real reviews. */}
      <TestimonialsSection />
    </>
  );
}

// The blue card beside the headline: the shop's photo when one is set,
// otherwise a drawn phone with a tracking card floating over it.
function HeroCard({ image }: { image: SiteImage }) {
  return (
    <div className="relative min-h-80 overflow-hidden rounded-[28px] bg-primary sm:min-h-[26rem]">
      {image.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.src} alt={image.alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="absolute top-6 -right-6 bottom-[-4rem] w-[62%] rotate-[-8deg] rounded-[44px] border-[12px] border-ink bg-primary-foreground/95 p-5 sm:right-10 sm:w-[52%]"
        >
          <div className="mt-24 space-y-3.5">
            <div className="h-20 rounded-2xl bg-primary/10" />
            <div className="h-14 rounded-2xl bg-primary/10" />
            <div className="h-14 rounded-2xl bg-primary/10" />
          </div>
        </div>
      )}
      {/* An example of what a customer sees on the tracking link. */}
      <div className="absolute top-5 left-5 w-64 max-w-[calc(100%-2.5rem)] rounded-2xl bg-card p-4 text-card-foreground sm:top-6 sm:left-6">
        <p className="text-xs font-semibold text-muted-foreground">Your repair · live</p>
        <p className="mt-1 text-lg font-extrabold">Repairing</p>
        <div className="mt-2 grid grid-cols-6 gap-1" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full",
                i < 3 ? "bg-foreground" : i === 3 ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Step 4 of 6 · follow it from your phone</p>
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  note,
  image,
  tileClass,
  art,
}: {
  title: string;
  note: string;
  image: SiteImage;
  tileClass: string;
  art: React.ReactNode;
}) {
  return (
    <article className="rounded-[24px] bg-card p-3">
      <div
        className={cn(
          "relative grid h-36 place-items-center overflow-hidden rounded-[18px] sm:h-40",
          tileClass,
        )}
      >
        {image.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.src} alt={image.alt} className="absolute inset-0 size-full object-cover" />
        ) : (
          art
        )}
      </div>
      <h3 className="mt-4 px-2 text-lg font-extrabold">{title}</h3>
      <p className="px-2 pb-2 text-sm text-muted-foreground">{note}</p>
    </article>
  );
}

function ChipArt() {
  return (
    <svg viewBox="0 0 100 80" className="h-20" aria-hidden>
      <g className="stroke-primary" strokeWidth="3" strokeLinecap="round">
        {[30, 40, 50, 60].map((y) => (
          <g key={y}>
            <line x1="18" y1={y - 5} x2="32" y2={y - 5} />
            <line x1="68" y1={y - 5} x2="82" y2={y - 5} />
          </g>
        ))}
        {[40, 47, 54, 61].map((x) => (
          <g key={x}>
            <line x1={x - 2} y1="8" x2={x - 2} y2="22" />
            <line x1={x - 2} y1="58" x2={x - 2} y2="72" />
          </g>
        ))}
      </g>
      <rect x="30" y="20" width="40" height="40" rx="6" className="fill-primary" />
    </svg>
  );
}

function CrackedPhoneArt() {
  return (
    <svg viewBox="0 0 60 100" className="h-24" aria-hidden>
      <rect x="4" y="4" width="52" height="92" rx="10" className="fill-card stroke-ink" strokeWidth="6" />
      <path d="M24 26 L36 46 L26 58 L36 76" className="fill-none stroke-primary" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function DropArt() {
  return (
    <svg viewBox="0 0 60 80" className="h-20" aria-hidden>
      <path d="M30 4 C30 4 6 34 6 50 a24 24 0 0 0 48 0 C54 34 30 4 30 4 Z" className="fill-primary-foreground" />
      <path d="M20 52 a10 10 0 0 0 10 10" className="fill-none stroke-primary" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
