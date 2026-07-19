import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "Phone repair in Colombo you can watch happen — submit repairs online, track live status, pay securely in LKR, and shop hand-checked accessories.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mobilux — Phone Repair & Accessories in Colombo",
    template: "%s | Mobilux",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Mobilux",
  keywords: [
    "phone repair Colombo",
    "mobile repair Sri Lanka",
    "screen replacement",
    "battery replacement",
    "phone accessories Sri Lanka",
    "repair tracking",
  ],
  openGraph: {
    type: "website",
    siteName: "Mobilux",
    title: "Mobilux — Phone Repair & Accessories in Colombo",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_LK",
  },
  twitter: {
    card: "summary",
    title: "Mobilux — Phone Repair & Accessories in Colombo",
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
        className={`${inter.variable} ${spaceGrotesk.variable} min-h-dvh font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
