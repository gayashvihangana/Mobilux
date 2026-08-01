import type { Metadata } from "next";
import { Inter, Space_Grotesk, Newsreader } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SHOP, SITE_URL } from "@/lib/config";
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

// Shop-specific, so it follows SHOP rather than being hardcoded — a second
// shop running this should not be publishing Mobilux's name and city.
const SITE_TITLE = `${SHOP.name} — Phone Repair & Accessories${
  SHOP.city ? ` in ${SHOP.city.split(",")[0]}` : ""
}`;

const SITE_DESCRIPTION = `Phone repair you can watch happen — submit repairs online, track live status, pay securely in LKR, and shop hand-checked accessories${
  SHOP.city ? ` in ${SHOP.city}` : ""
}.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SHOP.name}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SHOP.name,
  keywords: [
    "phone repair",
    "mobile repair",
    "screen replacement",
    "battery replacement",
    "phone accessories",
    "repair tracking",
    ...(SHOP.city ? [`phone repair ${SHOP.city.split(",")[0]}`] : []),
  ],
  openGraph: {
    type: "website",
    siteName: SHOP.name,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_LK",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
