import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div
        className="glow-primary absolute -top-40 left-1/2 h-100 w-150 -translate-x-1/2 rounded-full blur-[110px]"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-105">{children}</div>
      </main>
    </div>
  );
}
