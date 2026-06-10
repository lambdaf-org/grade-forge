import type { Metadata } from "next";
import { Zilla_Slab, Spectral, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Zilla_Slab({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const body = Spectral({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "rechenschaft · grades that show their work",
  description:
    "A Swiss grade calculator that prints the formula, the inputs, and the rounding rule behind every average. No accounts, no upload — everything stays in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
