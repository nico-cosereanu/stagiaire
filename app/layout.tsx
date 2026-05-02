import type { Metadata } from "next";
import { Source_Serif_4, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/*
 * Free font stack from docs/design-direction.md §1.
 * Source Serif 4   -> body (--font-serif)
 * Fraunces         -> chancery display (--font-display) — italic carries the romance
 * Inter            -> UI sans (--font-sans) — used sparingly
 * JetBrains Mono   -> timestamps, IDs, code (--font-mono)
 */

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stagiaire",
  description:
    "Discover and book stages at Michelin-starred restaurants worldwide. The global directory of every 1, 2, and 3-star kitchen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
