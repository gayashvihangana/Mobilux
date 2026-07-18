import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  BatteryCharging,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Droplets,
  MonitorSmartphone,
  PlugZap,
  Radar,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: MonitorSmartphone,
    title: "Screen replacement",
    description: "Cracked or dead displays replaced with quality panels, color-matched and tested.",
  },
  {
    icon: BatteryCharging,
    title: "Battery service",
    description: "Fast battery swaps that restore all-day life to phones, tablets and watches.",
  },
  {
    icon: Droplets,
    title: "Water damage recovery",
    description: "Ultrasonic cleaning and board-level treatment to bring soaked devices back.",
  },
  {
    icon: Cpu,
    title: "Software & unlocks",
    description: "OS reinstalls, data recovery, FRP and performance tune-ups done safely.",
  },
  {
    icon: Camera,
    title: "Camera & audio",
    description: "Blurry cameras, silent speakers and broken mics repaired to factory feel.",
  },
  {
    icon: PlugZap,
    title: "Charging port repair",
    description: "Loose or dead charging ports re-soldered or replaced the same day.",
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Submit your repair",
    description: "Tell us the device and the problem in a two-minute online form — add photos if you like.",
  },
  {
    icon: Radar,
    title: "We diagnose",
    description: "Your device is logged with a ticket number and diagnosed by our technician.",
  },
  {
    icon: Wrench,
    title: "Track every step",
    description: "Follow live status from diagnosis to testing on your dashboard — no calls needed.",
  },
  {
    icon: CheckCircle2,
    title: "Pay & collect",
    description: "Pay in LKR by bank transfer or online, then pick up your fixed device.",
  },
];

const features = [
  {
    icon: Radar,
    title: "Live repair tracking",
    description: "A real status pipeline — Received, Diagnosing, In Progress, Ready — updated as work happens.",
  },
  {
    icon: Wallet,
    title: "Pay your way in LKR",
    description: "Bank transfer with receipt upload today; secure online card payments coming soon.",
  },
  {
    icon: BadgePercent,
    title: "Loyalty rewards",
    description: "Repeat repairs earn automatic discounts. The more you trust us, the less you pay.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty on every fix",
    description: "Every repair leaves with a warranty and a digital paper trail you can always look up.",
  },
];

const heroStats = [
  { value: "500+", label: "Devices repaired" },
  { value: "4.9★", label: "Customer rating" },
  { value: "24h", label: "Typical turnaround" },
  { value: "30-day", label: "Repair warranty" },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div
          className="animate-glow-pulse absolute -top-40 left-1/2 h-130 w-190 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-40 pb-20 sm:pt-48">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary sm:text-sm">
              <Sparkles className="size-3.5" />
              Colombo&apos;s smartest phone repair experience
            </p>
            <h1
              className="animate-fade-up font-display mt-6 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              Phone repair you can <span className="text-gradient">actually track</span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              Submit a repair in minutes, follow every step live, pay securely in
              LKR, and earn discounts every time you come back. No more
              &ldquo;is it ready yet?&rdquo; phone calls.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "240ms" }}
            >
              <Button asChild size="lg" className="h-12 w-full px-7 text-base shadow-lg shadow-primary/25 sm:w-auto">
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
                <Link href="/login">Track my device</Link>
              </Button>
            </div>
          </div>

          {/* Mock live ticket card */}
          <div
            className="animate-fade-up mx-auto mt-16 max-w-2xl"
            style={{ animationDelay: "340ms" }}
          >
            <div className="glass rounded-2xl p-5 shadow-2xl shadow-primary/10 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/15">
                    <Smartphone className="size-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">iPhone 14 Pro — Screen replacement</p>
                    <p className="text-xs text-muted-foreground">Ticket MBX-0042 · Today, 2:14 PM</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  In Progress
                </span>
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                  ))}
                  <span className="h-1.5 flex-1 rounded-full bg-primary/40" />
                  <span className="h-1.5 flex-1 rounded-full bg-muted" />
                  <span className="h-1.5 flex-1 rounded-full bg-muted" />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground sm:text-xs">
                  <span>Received</span>
                  <span className="text-primary">In Progress</span>
                  <span>Ready for pickup</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-3xl font-bold text-foreground">
                  {stat.value}
                </dd>
                <dd className="mt-1 text-sm text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="scroll-mt-24 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">
              Services
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Every fix your device needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              From shattered screens to soaked motherboards — phones, tablets,
              laptops and smartwatches handled with care.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <span className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <service.icon className="size-5 text-primary" />
                </span>
                <h3 className="mt-4 font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-24 border-y border-border bg-card/40 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">
              How it works
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From broken to fixed in four steps
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                    <step.icon className="size-5 text-primary" />
                  </span>
                  <span className="font-display text-4xl font-bold text-primary/20">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Why Mobilux ──────────────────────────────────────── */}
      <section id="why-mobilux" className="scroll-mt-24 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                Why Mobilux
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Built for people who hate not knowing
              </h2>
              <p className="mt-4 text-muted-foreground">
                Most repair shops go quiet the moment you hand over your phone.
                Mobilux keeps you in the loop with a live ticket, transparent
                pricing, and a digital record of every repair you&apos;ve ever done
                with us.
              </p>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-success/30 bg-success/10">
                  <CalendarClock className="size-5 text-success" />
                </span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Same-day service</span>{" "}
                  on most screen and battery repairs — drop off in the morning,
                  collect by evening.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <span className="grid size-10 place-items-center rounded-lg border border-primary/25 bg-primary/10">
                    <feature.icon className="size-4.5 text-primary" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div
          className="absolute top-1/2 left-1/2 h-72 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[100px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Your phone deserves better than a <span className="text-gradient">mystery repair</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Create a free account, submit your first repair request, and watch
            it move — step by step — until it&apos;s back in your hands.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 px-8 text-base shadow-lg shadow-primary/25">
            <Link href="/register">
              Get started free <ArrowRight className="size-4.5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
