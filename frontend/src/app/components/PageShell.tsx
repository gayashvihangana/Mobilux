import type { ReactNode } from "react";
import Link from "next/link";

type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl">
            Mobilux
          </Link>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">{title}</p>
            {subtitle ? <p className="mt-2 text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
