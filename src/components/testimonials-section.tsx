import Image from "next/image";
import Link from "next/link";
import { Quote, Star } from "lucide-react";
import type { Testimonial } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { testimonialsVisible } from "@/lib/settings";
import { APPROVED_ORDER, averageRating, initialsOf } from "@/lib/testimonials";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        "relative flex w-80 shrink-0 flex-col gap-4 rounded-[24px] bg-card p-6 sm:w-88",
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

export async function TestimonialsSection() {
  const [visible, testimonials] = await Promise.all([
    testimonialsVisible(),
    prisma.testimonial.findMany({
      where: { status: "APPROVED" },
      orderBy: APPROVED_ORDER,
      take: MAX_SHOWN,
    }),
  ]);

  // Fewer than three approved reviews (or the section switched off in
  // admin): skip it. One or two reviews read as thin, or as the owner's own.
  if (!visible || testimonials.length < 3) return null;

  const average = averageRating(testimonials.map((t) => t.rating));
  const shown = testimonials.slice(0, 6);

  return (
    <section id="testimonials" className="scroll-mt-24 pb-16">
      <div className="mx-auto max-w-6xl space-y-4 px-4">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              What customers say
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRating rating={average} size="lg" />
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{average.toFixed(1)}</span>{" "}
                from {testimonials.length} reviews
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href="/feedback">
              <Star className="size-4" /> Leave a review
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              className="h-full w-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
