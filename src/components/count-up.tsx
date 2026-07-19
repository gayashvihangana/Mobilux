"use client";

import { useEffect, useRef, useState } from "react";

type Format = "int" | "lkr" | "percent1";

function formatValue(value: number, format: Format) {
  switch (format) {
    case "lkr":
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "percent1":
      return `${value.toFixed(1)}%`;
    default:
      return Math.round(value).toLocaleString("en-LK");
  }
}

// Animates a KPI number from 0 to its value when it scrolls into view.
// Server-renders the final value so crawlers and no-JS users see real data.
export function CountUp({
  value,
  format = "int",
  duration = 1000,
}: {
  value: number;
  format?: Format;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => formatValue(value, format));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(formatValue(value * eased, format));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, format, duration]);

  return <span ref={ref}>{display}</span>;
}
