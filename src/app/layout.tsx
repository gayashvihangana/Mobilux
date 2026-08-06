import type { Metadata } from "next";
import { Inter, Space_Grotesk, Newsreader } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/config";
import { getShopInfo } from "@/lib/settings";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Warm editorial serif used for the printed/downloaded bill.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Async, not a static export, so the browser tab title and social previews
// follow the name saved under Admin → Settings. A static `metadata` object is
// evaluated once at build time, which is why renaming a shop used to change
// the bill but not the tab.
export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopInfo();
  const city = shop.address;

  const title = `${shop.name} — Phone Repair & Accessories${
    city ? ` in ${city.split(",")[0]}` : ""
  }`;
  const description = `Phone repair you can watch happen — submit repairs online, track live status, pay securely in LKR, and shop hand-checked accessories${
    city ? ` in ${city}` : ""
  }.`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${shop.name}`,
    },
    description,
    applicationName: shop.name,
    keywords: [
      "phone repair",
      "mobile repair",
      "screen replacement",
      "battery replacement",
      "phone accessories",
      "repair tracking",
      ...(city ? [`phone repair ${city.split(",")[0]}`] : []),
    ],
    openGraph: {
      type: "website",
      siteName: shop.name,
      title,
      description,
      url: "/",
      locale: "en_LK",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shop = await getShopInfo();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      // Every branded token in globals.css is expressed as a rotation of this
      // hue, so one inline value re-colours the whole app. Inline beats both
      // `:root` and `.dark`, which is what makes it work in either theme.
      style={{ "--brand-hue": shop.accentHue } as React.CSSProperties}
    >
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable} min-h-dvh font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
