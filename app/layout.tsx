import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/nav";
import MobileNav from "@/components/mobile-nav";
import CookieBanner from "@/components/cookie-banner";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scalpy — Scan capillaire par IA",
  description:
    "Analyse ton cuir chevelu en 30 secondes. Score de densité, stade Norwood, zones à surveiller et protocole personnalisé — gratuit, depuis ton téléphone.",
  keywords: [
    "perte de cheveux",
    "scan capillaire",
    "densité capillaire",
    "Norwood",
    "repousse cheveux",
    "analyse IA",
  ],
  openGraph: {
    title: "Scalpy — Scanne ton crâne, vois ta repousse",
    description:
      "Score de densité, stade Norwood et protocole personnalisé en 30 secondes.",
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
  themeColor: "#0a0a0c",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans pb-16 sm:pb-0">
        <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-foreground"
            >
              Scalpy
            </Link>
            <Nav />
          </div>
        </header>
        <ToastProvider>
          {children}
          <MobileNav />
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
