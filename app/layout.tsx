import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/nav";
import MobileNav from "@/components/mobile-nav";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

// Corps : Inter, lisible et neutre, le confort de lecture
const bodyFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Titres : Space Grotesk, tracking serré, le caractère "instrument"
const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Données : JetBrains Mono, chiffres tabulaires pour score, stats, mesures, prix
const dataFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Scalpy · Sache où en sont tes cheveux, en une photo",
  description:
    "Ton score de densité, tes zones et ton stade en 30 secondes, plus l'aperçu de ton objectif. Gratuit, sans carte, depuis ton téléphone.",
  keywords: [
    "perte de cheveux",
    "scan capillaire",
    "densité capillaire",
    "Norwood",
    "bien-être capillaire",
    "analyse IA",
  ],
  openGraph: {
    title: "Scalpy · Sache où en sont tes cheveux, en une photo",
    description:
      "Ton score de densité, tes zones et ton stade en 30 secondes, plus l'aperçu de ton objectif.",
    type: "website",
    locale: "fr_FR",
    siteName: "Scalpy",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F9FB",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${bodyFont.variable} ${displayFont.variable} ${dataFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans pb-16 sm:pb-0">
        <header className="sticky top-0 z-50 border-b border-border bg-bg/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 text-text"
            >
              <svg width="28" height="28" viewBox="0 0 56 56" fill="none" aria-label="Scalpy" className="transition-transform duration-[var(--dur)] ease-[var(--ease-out)] group-hover:rotate-[30deg]">
                <circle cx="28" cy="28" r="22" stroke="var(--accent-light)" strokeOpacity=".25"/>
                <circle cx="28" cy="28" r="14" stroke="var(--accent-light)" strokeOpacity=".45"/>
                <g stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M28 4 V10 M28 46 V52 M4 28 H10 M46 28 H52"/>
                </g>
                <circle cx="28" cy="28" r="3.6" fill="var(--accent)"/>
              </svg>
              <span className="font-display text-xl font-semibold tracking-[-0.02em]">Scalpy</span>
            </Link>
            <Nav />
          </div>
        </header>
        <ToastProvider>
          {children}
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
