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
import { Button } from "@/components/ui/button";

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
    description: "Describe the device and problem in a two-minute form.",
  },
  {
    icon: Radar,
    title: "We diagnose",
    description: "Your device gets a ticket number and a diagnosis.",
  },
  {
    icon: Wrench,
    title: "Track every step",
    description: "Follow live status on your dashboard — no calls needed.",
  },
  {
    icon: CheckCircle2,
    title: "Pay & collect",
    description: "Pay in LKR, then pick up your fixed device.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div
          className="animate-glow-pulse glow-primary absolute -top-40 left-1/2 h-130 w-190 -translate-x-1/2 rounded-full blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-44 pb-28 sm:pt-56 sm:pb-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="animate-fade-up font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              We fix your phone.{" "}
              <span className="text-gradient">You watch it happen.</span>
            </h1>
            <p
              className="animate-fade-up mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
              style={{ animationDelay: "100ms" }}
            >
              Cracked screens, dead batteries, water damage — repaired fast in
              Colombo, with every step tracked live from drop-off to pickup.
            </p>
            <div
              className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "200ms" }}
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
                <Link href="/login">Track my device</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Every fix your device needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              Phones, tablets, laptops and smartwatches — handled with care.
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
      <section
        id="how-it-works"
        className="scroll-mt-24 border-y border-border bg-card/40 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From broken to fixed in four steps
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-border bg-card p-6"
              >
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

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div
          className="glow-primary absolute top-1/2 left-1/2 h-72 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
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
        </div>
      </section>
    </>
  );
}
