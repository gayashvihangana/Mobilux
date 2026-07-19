import Link from "next/link";
import {
  ArrowRight,
  BatteryCharging,
  Camera,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Droplets,
  MonitorSmartphone,
  PlugZap,
  Radar,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import { SHOP, SITE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/hero-visual";
import { Parallax } from "@/components/parallax";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

const services = [
  {
    icon: MonitorSmartphone,
    title: "Screen replacement",
    description: "Cracked or dead displays replaced with quality panels.",
  },
  {
    icon: BatteryCharging,
    title: "Battery service",
    description: "Fast swaps that restore all-day battery life.",
  },
  {
    icon: Droplets,
    title: "Water damage recovery",
    description: "Board-level treatment to bring soaked devices back.",
  },
  {
    icon: Cpu,
    title: "Software & unlocks",
    description: "OS reinstalls, data recovery and tune-ups done safely.",
  },
  {
    icon: Camera,
    title: "Camera & audio",
    description: "Blurry cameras, silent speakers and mics repaired.",
  },
  {
    icon: PlugZap,
    title: "Charging port repair",
    description: "Loose or dead ports re-soldered or replaced same day.",
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Submit your repair",
    description:
      "Describe the device and the problem in a two-minute form — or just walk in and we'll log it for you.",
  },
  {
    icon: Radar,
    title: "We diagnose",
    description:
      "Your device gets a ticket number and a clear diagnosis with a confirmed price before any work starts.",
  },
  {
    icon: Wrench,
    title: "Track every step",
    description:
      "Watch the repair move live — received, diagnosing, repairing, ready — from any device, no calls needed.",
  },
  {
    icon: CheckCircle2,
    title: "Pay & collect",
    description:
      "Pay securely in LKR, pick up your fixed device, and every repair counts toward loyalty discounts.",
  },
];

// LocalBusiness rich-result data so Google shows shop info in search
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ElectronicsStore",
  name: SHOP.name,
  url: SITE_URL,
  telephone: SHOP.phone,
  email: SHOP.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Colombo",
    addressCountry: "LK",
  },
  description:
    "Phone repair and accessories shop in Colombo — screen replacement, battery service, water damage recovery, with live online repair tracking.",
};

export default async function HomePage() {
  const showPhones = await phonesVisible();
  const featuredProducts = await prisma.product.findMany({
    where: {
      visible: true,
      ...(showPhones ? {} : { category: "ACCESSORY" as const }),
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero — full-bleed cover with parallax depth ──────── */}
      <section className="relative flex min-h-svh items-center overflow-hidden">
        {/* Cover image (theme-matched), drifting slower than the page */}
        <Parallax speed={0.35} className="absolute inset-x-0 -inset-y-[14%]">
          <div className="absolute inset-0 bg-[url('/hero-cover-light.svg')] bg-cover bg-center dark:hidden" />
          <div className="absolute inset-0 hidden bg-[url('/hero-cover-dark.svg')] bg-cover bg-center dark:block" />
        </Parallax>
        <div className="bg-grid absolute inset-0 opacity-50" aria-hidden />
        <div
          className="animate-glow-pulse glow-primary absolute -top-40 left-1/2 h-130 w-190 -translate-x-1/2 rounded-full blur-[120px]"
          aria-hidden
        />
        {/* Fade the cover into the page below */}
        <div
          className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-background"
          aria-hidden
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-16 px-4 pt-32 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div className="text-center lg:text-left">
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live repair tracking · Colombo
            </p>
            <h1 className="font-display mt-5 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-[4.4rem]">
              {"We fix your phone.".split(" ").map((word, i) => (
                <span
                  key={word + i}
                  className="animate-fade-up inline-block"
                  style={{ animationDelay: `${80 + i * 80}ms` }}
                >
                  {word}&nbsp;
                </span>
              ))}
              <span
                className="text-gradient animate-fade-up inline-block"
                style={{ animationDelay: "440ms" }}
              >
                You watch it happen.
              </span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0"
              style={{ animationDelay: "160ms" }}
            >
              Cracked screens, dead batteries, water damage — repaired fast,
              with every step tracked live from drop-off to pickup.
            </p>
            <div
              className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
              style={{ animationDelay: "240ms" }}
            >
              <Button
                asChild
                size="lg"
                className="h-12 w-full px-7 text-base shadow-lg shadow-primary/25 sm:w-auto"
              >
                <Link href="/register">
                  Start a repair <ArrowRight className="size-4.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full px-7 text-base sm:w-auto"
              >
                <Link href="/track">Track my device</Link>
              </Button>
            </div>
            <div
              className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start"
              style={{ animationDelay: "560ms" }}
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success" /> Same-day fixes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success" /> 30-day
                warranty
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success" /> Genuine parts
              </span>
            </div>
          </div>

          {/* Foreground drifts slightly ahead of the scroll for depth */}
          <Parallax speed={-0.08}>
            <HeroVisual />
          </Parallax>
        </div>

        {/* Scroll cue */}
        <div
          className="animate-fade-in absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2.5 sm:flex"
          style={{ animationDelay: "1100ms" }}
          aria-hidden
        >
          <span className="text-[10px] font-semibold tracking-[0.35em] text-muted-foreground uppercase">
            Scroll
          </span>
          <span className="relative h-10 w-px overflow-hidden bg-border">
            <span className="animate-scroll-hint absolute top-0 left-0 h-4 w-px bg-primary" />
          </span>
        </div>
      </section>

      {/* ── Featured shop items ──────────────────────────────── */}
      {featuredProducts.length > 0 ? (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <ScrollReveal className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                  Shop
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Gear up while we fix
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Cases, chargers and more — hand-checked by the same
                  technicians who repair your devices.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/shop">
                  Browse the shop <ArrowRight className="size-4" />
                </Link>
              </Button>
            </ScrollReveal>
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {featuredProducts.map((product, i) => (
                <ScrollReveal key={product.id} delay={i * 90}>
                  <ProductCard product={product} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Services ─────────────────────────────────────────── */}
      <section
        id="services"
        className="scroll-mt-24 border-t border-border bg-card/40 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">
              Services
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Every fix your device needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              Phones, tablets, laptops and smartwatches — handled with care.
            </p>
          </ScrollReveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <ScrollReveal key={service.title} delay={(i % 3) * 100}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                  <span className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <service.icon className="size-5 text-primary" />
                  </span>
                  <h3 className="mt-4 font-semibold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — animated timeline ─────────────────── */}
      <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">
              How it works
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From broken to fixed in four steps
            </h2>
          </ScrollReveal>

          <ol className="relative mx-auto mt-16 max-w-4xl">
            {/* Timeline spine */}
            <div
              className="absolute top-2 bottom-8 left-5 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent md:left-1/2"
              aria-hidden
            />
            {steps.map((step, i) => {
              const left = i % 2 === 0;
              return (
                <li key={step.title} className="relative pb-16 pl-16 last:pb-0 md:pl-0">
                  {/* Node on the spine */}
                  <span className="absolute top-2 left-5 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full border border-primary/40 bg-background shadow-[0_0_24px] shadow-primary/30 md:left-1/2">
                    <step.icon className="size-4.5 text-primary" />
                  </span>
                  <ScrollReveal
                    variant={left ? "left" : "right"}
                    className={cn(
                      "md:w-[calc(50%-3.5rem)]",
                      left ? "md:mr-auto md:text-right" : "md:ml-auto",
                    )}
                  >
                    <span
                      className="font-display block text-6xl font-bold text-primary/10 select-none sm:text-7xl"
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display -mt-5 text-xl font-semibold sm:text-2xl">
                      {step.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-2.5 max-w-sm leading-relaxed text-muted-foreground",
                        left && "md:ml-auto",
                      )}
                    >
                      {step.description}
                    </p>
                  </ScrollReveal>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div
          className="glow-primary absolute top-1/2 left-1/2 h-72 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          aria-hidden
        />
        <ScrollReveal variant="scale" className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Ready when your phone isn&apos;t
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Create a free account, submit your first repair, and watch it move
            step by step until it&apos;s back in your hands.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 px-8 text-base shadow-lg shadow-primary/25"
          >
            <Link href="/register">
              Get started free <ArrowRight className="size-4.5" />
            </Link>
          </Button>
        </ScrollReveal>
      </section>
    </>
  );
}
