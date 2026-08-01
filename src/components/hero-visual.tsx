import {
  Bell,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Wrench,
} from "lucide-react";
import { SHOP } from "@/lib/config";

// Hero cover art: a phone running the shop's tracker, built from theme
// tokens so it matches light and dark mode exactly — no photo needed.
export function HeroVisual() {
  return (
    <div
      className="animate-fade-up relative mx-auto w-fit"
      style={{ animationDelay: "250ms" }}
      aria-hidden
    >
      <div
        className="glow-primary absolute top-1/2 left-1/2 h-105 w-105 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
      />

      {/* Phone frame */}
      <div className="glass relative w-66 rotate-2 rounded-[2.6rem] p-2.5 shadow-2xl shadow-primary/15 transition-transform duration-500 hover:rotate-0 sm:w-72">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-background">
          {/* Notch */}
          <div className="flex h-9 items-center justify-center">
            <div className="h-5 w-24 rounded-full bg-foreground/10" />
          </div>

          <div className="space-y-3 px-4 pt-1 pb-6">
            {/* Mini app header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="grid size-5 place-items-center rounded-md bg-primary/15">
                  <Smartphone className="size-3 text-primary" />
                </span>
                <span className="font-display text-xs font-bold">{SHOP.name}</span>
              </div>
              <span className="relative">
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary" />
              </span>
            </div>

            {/* Ticket card */}
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  REP-044
                </span>
                <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">
                  In progress
                </span>
              </div>
              <p className="mt-1.5 text-xs font-semibold">
                iPhone 13 · Screen replacement
              </p>
              {/* Mini stepper */}
              <div className="mt-3 flex items-center gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="h-1 flex-1 rounded-full bg-success"
                  />
                ))}
                <span className="h-1 flex-1 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/60" />
                {[0, 1].map((i) => (
                  <span key={i} className="h-1 flex-1 rounded-full bg-border" />
                ))}
              </div>
            </div>

            {/* Mini status history */}
            <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
              {[
                { w: "w-24", active: true },
                { w: "w-32", active: false },
                { w: "w-20", active: false },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${row.active ? "bg-primary shadow-[0_0_6px] shadow-primary/60" : "bg-muted-foreground/30"}`}
                  />
                  <span
                    className={`h-1.5 ${row.w} rounded-full ${row.active ? "bg-foreground/25" : "bg-muted-foreground/15"}`}
                  />
                </div>
              ))}
            </div>

            {/* Mini payment row */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase">
                  To pay
                </p>
                <p className="font-display text-xs font-bold">LKR 12,500</p>
              </div>
              <span className="rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-semibold text-primary-foreground">
                Upload receipt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div
        className="animate-float glass absolute -right-8 top-16 rounded-xl px-3 py-2 shadow-lg sm:-right-14"
        style={{ animationDelay: "0.8s" }}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold">
          <CheckCircle2 className="size-3.5 text-success" /> Ready for pickup
        </p>
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          REP-044 · just now
        </p>
      </div>

      {/* Floating chips */}
      <div className="animate-float glass absolute -left-8 top-40 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-lg sm:-left-14">
        <Wrench className="size-3.5 text-primary" />
        <span className="text-[10px] font-semibold">Genuine parts</span>
      </div>
      <div
        className="animate-float glass absolute -bottom-3 -left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-lg sm:-left-8"
        style={{ animationDelay: "1.6s" }}
      >
        <ShieldCheck className="size-3.5 text-success" />
        <span className="text-[10px] font-semibold">30-day warranty</span>
      </div>
    </div>
  );
}
