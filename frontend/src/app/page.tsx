import Link from "next/link";

const services = [
  {
    title: "Screen Replacement",
    description: "Precision glass and OLED replacements with same-day turnaround.",
    price: "From LKR 9,500",
  },
  {
    title: "Battery Diagnostics",
    description: "Safe battery swaps and health checks for longer device life.",
    price: "From LKR 6,500",
  },
  {
    title: "Water Damage Recovery",
    description: "Board-level cleaning and recovery to save critical data.",
    price: "From LKR 12,500",
  },
  {
    title: "Speaker and Mic Repairs",
    description: "Crystal-clear audio restoration with genuine parts.",
    price: "From LKR 4,200",
  },
];

const features = [
  {
    title: "Live repair tracking",
    description: "Track every stage from intake to ready for pickup.",
  },
  {
    title: "Bank transfer payments",
    description: "Upload receipts and get manual verification quickly.",
  },
  {
    title: "Loyalty discounts",
    description: "Earn savings after repeat repairs with automatic eligibility.",
  },
];

const testimonials = [
  {
    name: "Tharindu P.",
    quote: "Fast turnaround and constant updates. My phone looked new.",
  },
  {
    name: "Isuri W.",
    quote: "The repair status updates kept me calm. Great service.",
  },
  {
    name: "Kasun R.",
    quote: "Payment verification was smooth and the staff was helpful.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-2xl text-shadow-glow">
            Mobilux
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#services" className="transition hover:text-white">
              Services
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#testimonials" className="transition hover:text-white">
              Testimonials
            </a>
            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm transition hover:border-slate-500"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-24">
        <section className="relative mt-10 overflow-hidden rounded-[32px] border border-slate-800/70 bg-mesh px-8 py-16 md:px-14">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/10 via-slate-950/40 to-slate-950/80" />
          <div className="relative z-10 grid gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-amber-200">
                Trusted phone repair hub
              </p>
              <h1 className="font-display text-4xl leading-tight text-white text-shadow-glow md:text-6xl">
                Premium phone repairs with real-time tracking.
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                Mobilux keeps you informed, priced fairly in LKR, and back on your device fast.
                Track every repair step, upload bank transfer receipts, and unlock loyalty discounts.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
                >
                  Book a repair
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
                >
                  Track a repair
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { label: "Avg turnaround", value: "12 hours" },
                  { label: "Devices serviced", value: "12k+" },
                  { label: "Customer rating", value: "4.9" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative space-y-4">
              <div className="animate-float rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-[0_35px_70px_-40px_rgba(17,24,39,0.9)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Repair status</p>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    Ready for pickup
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">iPhone 12 Pro</h3>
                <p className="mt-2 text-sm text-slate-400">Screen replacement and diagnostics</p>
                <div className="mt-6 space-y-3">
                  {["Intake", "In progress", "Quality check", "Ready for pickup"].map((step, index) => (
                    <div key={step} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className={`h-2 w-2 rounded-full ${index > 2 ? "bg-slate-600" : "bg-amber-400"}`} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-400">Next payment</p>
                <p className="mt-2 text-3xl font-semibold text-white">LKR 22,000</p>
                <p className="mt-2 text-sm text-slate-400">Upload bank transfer receipt to confirm.</p>
                <button className="mt-4 w-full rounded-2xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900">
                  Upload receipt
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Services</p>
              <h2 className="font-display text-3xl text-white md:text-4xl">
                Phone repairs crafted for speed and trust
              </h2>
            </div>
            <p className="max-w-xl text-slate-400">
              Every repair includes transparent diagnostics, genuine parts, and continuous status updates.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="animate-fade-up rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                <p className="mt-3 text-sm text-slate-400">{service.description}</p>
                <p className="mt-6 text-sm font-semibold text-amber-200">{service.price}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="grid gap-10 md:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Features</p>
            <h2 className="font-display text-3xl text-white md:text-4xl">
              Everything customers and staff need in one system
            </h2>
            <p className="text-slate-400">
              Mobilux connects customers, staff, and the owner in a single dashboard with live status,
              verified payments, and reward tracking.
            </p>
            <div className="grid gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6">
            <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Tracking snapshot</p>
              <div className="mt-6 space-y-4">
                {[
                  { label: "Pending", count: 5 },
                  { label: "In progress", count: 12 },
                  { label: "Completed", count: 38 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-900/80 p-4">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className="text-lg font-semibold text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Why Mobilux</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>Dedicated admin, staff, and customer portals</li>
                <li>Manual verification for secure bank transfers</li>
                <li>Repair history and discounts in one place</li>
                <li>Fast communication and transparent pricing</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="testimonials" className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Testimonials</p>
              <h2 className="font-display text-3xl text-white md:text-4xl">
                Customers trust Mobilux to deliver
              </h2>
            </div>
            <p className="max-w-xl text-slate-400">
              From cracked screens to water damage, our team delivers fast solutions with honest updates.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
                <p className="text-sm text-slate-300">&quot;{testimonial.quote}&quot;</p>
                <p className="mt-6 text-sm font-semibold text-white">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200">Contact</p>
            <h2 className="mt-4 font-display text-3xl text-white md:text-4xl">Talk to a Mobilux specialist</h2>
            <p className="mt-4 text-slate-400">
              Visit us in-store or send a message. We respond within one business day.
            </p>
            <div className="mt-8 space-y-4 text-sm text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span>Phone</span>
                <span>+94 11 234 5678</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span>Email</span>
                <span>support@mobilux.lk</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span>Location</span>
                <span>Colombo 07, Sri Lanka</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hours</span>
                <span>9:00 AM - 7:00 PM</span>
              </div>
            </div>
          </div>
          <form className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8">
            <h3 className="text-xl font-semibold text-white">Send a message</h3>
            <div className="mt-6 space-y-4">
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                placeholder="Full name"
              />
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                placeholder="Email address"
                type="email"
              />
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                placeholder="Tell us about the issue"
              />
              <button
                type="button"
                className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
              >
                Submit message
              </button>
              <p className="text-xs text-slate-500">
                This form is a demo. Connect it to your support inbox when ready.
              </p>
            </div>
          </form>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>Mobilux Phone Repair. All prices in LKR.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="transition hover:text-white">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
