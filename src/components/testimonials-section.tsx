import Image from "next/image";
import Link from "next/link";
import { Quote, Star } from "lucide-react";
import type { Testimonial } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { testimonialsVisible } from "@/lib/settings";
import { APPROVED_ORDER, averageRating, initialsOf } from "@/lib/testimonials";
import { StarRating } from "@/components/star-rating";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CountUp } from "@/components/count-up";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Enough cards to fill a row twice over — below this a marquee looks like a
// short loop stuttering past, so we lay the reviews out as a static grid.
const MIN_FOR_RAIL = 4;
const MAX_SHOWN = 24;

function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: Testimonial;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "group relative flex w-80 shrink-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 sm:w-88",
        testimonial.featured && "border-primary/30 bg-primary/[0.03]",
        className,
      )}
    >
      <Quote
        className="absolute top-5 right-5 size-8 text-primary/10 transition-colors duration-300 group-hover:text-primary/25"
        aria-hidden
      />
      <StarRating rating={testimonial.rating} animate />
      <blockquote className="text-sm leading-relaxed text-foreground/90">
        {testimonial.message}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        {testimonial.avatarUrl ? (
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full border border-border">
            <Image
              src={testimonial.avatarUrl}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          </span>
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(testimonial.name)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {testimonial.name}
          </span>
          {testimonial.deviceLabel ? (
            <span className="block truncate text-xs text-muted-foreground">
              {testimonial.deviceLabel}
            </span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

// One infinitely scrolling row. The cards are rendered twice so the track can
// travel exactly half its width and snap back invisibly; hovering pauses it
// (see .marquee-row in globals.css).
function MarqueeRow({
  testimonials,
  direction,
  duration,
}: {
  testimonials: Testimonial[];
  direction: "left" | "right";
  duration: number;
}) {
  return (
    <div className="marquee-row mask-fade-x overflow-hidden">
      <div
        data-marquee-track
        className={cn(
          "flex w-max gap-4",
          direction === "left"
            ? "animate-marquee-left"
            : "animate-marquee-right",
        )}
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-4" aria-hidden={copy === 1}>
            {testimonials.map((testimonial) => (
              <TestimonialCard
                key={`${copy}-${testimonial.id}`}
                testimonial={testimonial}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export async function TestimonialsSection() {
  const [visible, testimonials] = await Promise.all([
    testimonialsVisible(),
    prisma.testimonial.findMany({
      where: { status: "APPROVED" },
      orderBy: APPROVED_ORDER,
      take: MAX_SHOWN,
    }),
  ]);

  // Nothing approved (or the section switched off in admin) — the home page
  // simply skips it rather than showing an empty shell.
  if (!visible || testimonials.length === 0) return null;

  const average = averageRating(testimonials.map((t) => t.rating));
  const useRail = testimonials.length >= MIN_FOR_RAIL;
  // Split into two rows travelling opposite ways for depth.
  const half = Math.ceil(testimonials.length / 2);
  const rows = useRail
    ? [testimonials.slice(0, half), testimonials.slice(half)]
    : [];

  return (
    <section
      id="testimonials"
      className="relative scroll-mt-24 overflow-hidden border-t border-border py-20 sm:py-24"
    >
      <div
        className="glow-primary animate-glow-pulse absolute -top-24 left-1/2 h-72 w-160 -translate-x-1/2 rounded-full blur-[110px]"
        aria-hidden
      />

      <div className="relative">
        <ScrollReveal className="mx-auto max-w-2xl px-4 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            Testimonials
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Loved by people with fixed phones
          </h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <StarRating rating={average} size="lg" animate />
            <p className="text-sm text-muted-foreground">
              <span className="font-display text-lg font-bold text-foreground">
                {average.toFixed(1)}
              </span>{" "}
              average from{" "}
              <span className="font-semibold text-foreground">
                <CountUp value={testimonials.length} />
              </span>{" "}
              review{testimonials.length === 1 ? "" : "s"}
            </p>
          </div>
        </ScrollReveal>

        {useRail ? (
          <ScrollReveal className="mt-12 space-y-4" delay={120}>
            {rows.map((row, i) =>
              row.length > 0 ? (
                <MarqueeRow
                  key={i}
                  testimonials={row}
                  direction={i % 2 === 0 ? "left" : "right"}
                  duration={46 + i * 8}
                />
              ) : null,
            )}
          </ScrollReveal>
        ) : (
          <div className="mx-auto mt-12 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, i) => (
              <ScrollReveal key={testimonial.id} delay={i * 90}>
                <TestimonialCard
                  testimonial={testimonial}
                  className="h-full w-full"
                />
              </ScrollReveal>
            ))}
          </div>
        )}

        <ScrollReveal
          className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-3 px-4 text-center"
          delay={80}
        >
          <p className="text-sm text-muted-foreground">
            Had a repair with us?
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/feedback">
              <Star className="size-4" /> Leave your feedback
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
