import Link from "next/link";
import { auth } from "@/auth";
import { getShopInfo, shopWhatsappLink } from "@/lib/settings";
import { WhatsAppIcon } from "@/components/whatsapp";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";

// Visitors get the pitch; the anchors all live on the landing page.
const guestLinks = [
  { href: "/#services", label: "Services" },
  { href: "/track", label: "Track repair" },
  { href: "/shop", label: "Shop" },
  { href: "/#find-us", label: "Find us" },
];

// Signed-in visitors to the shop/track pages get their own workspace instead
// — the landing page now redirects them away, so linking to its anchors
// would only bounce them to the dashboard.
const customerLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/repairs", label: "My repairs" },
  { href: "/shop", label: "Shop" },
  { href: "/track", label: "Track repair" },
];

const adminLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/tickets", label: "Repairs" },
  { href: "/shop", label: "Shop" },
  { href: "/track", label: "Track repair" },
];

export async function SiteHeader() {
  const [session, shop] = await Promise.all([auth(), getShopInfo()]);
  const brand = {
    name: shop.name,
    logoUrl: shop.logoUrl,
    logoEmoji: shop.logoEmoji,
  };
  const user = session?.user;
  const chat = shopWhatsappLink(shop, `Hi ${shop.name}! I have a question.`);
  // Logged-in users land on their dashboard, not the marketing page.
  const homeHref = user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/";
  const navLinks = user
    ? user.role === "ADMIN"
      ? adminLinks
      : customerLinks
    : guestLinks;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex h-16 items-center justify-between gap-2 rounded-[20px] bg-card px-3 sm:px-4">
          <Logo brand={brand} href={homeHref} />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-11 items-center rounded-xl px-3 text-[15px] font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                    Dashboard
                  </Link>
                </Button>
                <UserMenu
                  name={user.name ?? "User"}
                  email={user.email ?? ""}
                  image={user.image}
                  isAdmin={user.role === "ADMIN"}
                />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden px-3 lg:inline-flex">
                  <Link href="/login">Log in</Link>
                </Button>
                {chat ? (
                  <Button asChild className="hidden sm:inline-flex">
                    <a href={chat} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon /> WhatsApp us
                    </a>
                  </Button>
                ) : null}
              </>
            )}
            <MobileNav
              brand={brand}
              links={navLinks}
              homeHref={homeHref}
              triggerClassName="md:hidden"
            >
              {user ? (
                <Button asChild variant="outline">
                  <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  {chat ? (
                    <Button asChild>
                      <a href={chat} target="_blank" rel="noopener noreferrer">
                        <WhatsAppIcon /> WhatsApp us
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link href="/login">Log in</Link>
                  </Button>
                </>
              )}
            </MobileNav>
          </div>
        </div>
      </div>
    </header>
  );
}
