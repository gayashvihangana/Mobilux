import type { Metadata } from "next";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-title",
  subsets: ["latin"],
});

const sans = Space_Grotesk({
  variable: "--font-primary",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mobilux | Phone Repair",
  description: "Mobilux phone repair services with tracking and payment support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-body"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
