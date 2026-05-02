import type { Metadata } from "next";
import { Source_Serif_4, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Free font stack from docs/design-direction.md §1, plus Opsmarckt for
 * restaurant names + the wordmark only.
 *
 *   Source Serif 4   -> body (--font-serif)
 *   Fraunces         -> chancery display (--font-display) — used for the
 *                       marquee CTA and any italic editorial moments
 *   Opsmarckt        -> restaurant names + Stagiaire wordmark (--font-headline)
 *   Inter            -> UI sans (--font-sans) — used sparingly
 *   JetBrains Mono   -> timestamps, IDs, code (--font-mono)
 *
 * NOTE on Opsmarckt: paid commercial typeface from T-26 ($19-67 webfont
 * license). The local copy in app/fonts/ was downloaded from a free-fonts
 * site and is fine for local prototyping. **Before public deploy**, buy
 * the proper webfont license from https://www.t26.com/fonts/Opsmarckt and
 * replace the .otf with the licensed .woff2.
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

const opsmarckt = localFont({
  src: "./fonts/opsmarckt-basic-regular.otf",
  variable: "--font-opsmarckt",
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
      className={`${sourceSerif.variable} ${fraunces.variable} ${opsmarckt.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
