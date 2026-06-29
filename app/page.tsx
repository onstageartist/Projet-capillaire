"use client";

import Link from "next/link";
import { Gauge, Disclaimer, Reveal, ScoreMark } from "@/components/ui";
import SmoothScroll from "@/components/smooth-scroll";
import { trackEvent } from "@/lib/track";
import { useEffect, useState, useRef } from "react";

interface HeroVariant {
  key: string;
  headline: string;
  sub: string;
  cta: string;
}

const HERO_VARIANTS: HeroVariant[] = [
  {
    key: "A",
    headline: "Sache où en sont tes cheveux. Reprends le contrôle avant qu'il soit trop tard.",
    sub: "Une photo, 30 secondes. Ton score de densité, tes zones, ton stade et l'aperçu de ton objectif. Gratuit, sans carte.",
    cta: "Faire mon scan gratuit",
  },
  {
    key: "B",
    headline: "Ta densité capillaire sur 100. Mesurée et suivie, mois après mois.",
    sub: "Scanne ton crâne, reçois ton score, tes zones et ton stade. Re-scanne chaque mois et vois ta courbe. Gratuit pour commencer.",
    cta: "Voir mon score",
  },
];

function getVariant(): HeroVariant {
  if (typeof window === "undefined") return HERO_VARIANTS[0];
  const stored = sessionStorage.getItem("scalpy_ab_hero");
  if (stored === "A" || stored === "B") {
    return HERO_VARIANTS.find((v) => v.key === stored)!;
  }
  const picked = Math.random() < 0.5 ? "A" : "B";
  sessionStorage.setItem("scalpy_ab_hero", picked);
  return HERO_VARIANTS.find((v) => v.key === picked)!;
}

function CtaButton({ className = "", variant }: { className?: string; variant?: string }) {
  return (
    <Link
      href="/onboarding"
      onClick={() => trackEvent("cta_scan_click", variant ? { variant } : undefined)}
      className={`inline-block rounded-[var(--radius-lg)] bg-accent px-8 py-4 text-lg font-semibold text-accent-foreground shadow-[var(--shadow-accent-glow)] transition-all duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 ${className}`}
    >
      {variant ? HERO_VARIANTS.find((v) => v.key === variant)?.cta ?? "Faire mon scan gratuit" : "Faire mon scan gratuit"}
    </Link>
  );
}

function StickyCtaBar({ variant }: { variant?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([e]) => setShow(!e.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg/95 p-3 sm:hidden">
      <Link
        href="/onboarding"
        onClick={() => trackEvent("cta_scan_click", variant ? { variant } : undefined)}
        className="block w-full rounded-[var(--radius-lg)] bg-accent py-3.5 text-center text-base font-semibold text-accent-foreground shadow-[var(--shadow-accent-glow)]"
      >
        {variant ? HERO_VARIANTS.find((v) => v.key === variant)?.cta ?? "Faire mon scan gratuit" : "Faire mon scan gratuit"}
      </Link>
    </div>
  );
}

export default function Home() {
  const [hero, setHero] = useState(HERO_VARIANTS[0]);
  const tracked = useRef(false);

  useEffect(() => {
    const v = getVariant();
    setHero(v);
    if (!tracked.current) {
      tracked.current = true;
      trackEvent("hero_viewed", { variant: v.key });
    }
  }, []);

  return (
    <SmoothScroll>
    <main className="flex flex-col">
      {/* Hero */}
      <section id="hero" className="grain relative isolate flex flex-col items-center overflow-hidden px-5 pb-20 pt-20 sm:pb-24 sm:pt-28">
        <div className="contour-bg" />
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-text-muted">
          <ScoreMark size={16} value={0.72} />
          Analyse capillaire de bien-être, par IA
        </span>
        <h1 className="w-full max-w-2xl text-balance text-center font-display t-hero font-semibold text-text">
          {hero.headline}
        </h1>
        <p className="mt-6 w-full max-w-lg text-pretty text-center text-base leading-relaxed text-text-muted">
          {hero.sub}
        </p>
        <div className="mt-10">
          <CtaButton variant={hero.key} />
        </div>
        <p className="mt-4 text-center text-xs text-text-faint">
          Gratuit · 30 secondes · Tes photos restent privées
        </p>
      </section>

      {/* Bandeau de confiance */}
      <section className="border-y border-border bg-surface/50 px-5 py-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-12">
          {[
            "Bien-être, pas un avis médical",
            "Tes photos restent privées, en Europe",
            "Gratuit, sans carte",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-text-muted">
              <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal as="h2" className="text-center font-display t-h2 text-balance font-semibold text-text">
            Comment ça marche
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                num: "1",
                title: "Scanne.",
                desc: "Prends ton crâne en photo. Tu reçois un score de densité, ton stade et tes zones.",
              },
              {
                num: "2",
                title: "Visualise.",
                desc: "Vois l'aperçu de ton objectif, sur ta propre photo. Une simulation, pas une promesse.",
              },
              {
                num: "3",
                title: "Suis.",
                desc: "Suis un plan sur 30 jours et re-scanne chaque mois pour voir ta courbe.",
              },
            ].map((s, i) => (
              <Reveal key={s.num} delay={i * 90} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft font-data text-lg font-semibold text-accent ring-1 ring-inset ring-accent/20">
                  {s.num}
                </div>
                <h3 className="mt-4 text-[17px] font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Demo du scan */}
      <section className="border-y border-border bg-surface/40 px-5 py-20 sm:py-24">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="font-display t-h2 text-balance font-semibold text-text">
            Le scan qui te dit tout
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-text-muted">
            En une photo, l'analyse situe ta densité, tes zones et ton stade.
            Tu vois clair en quelques secondes.
          </p>
          <div className="mt-10 flex justify-center">
            <Gauge score={72} label="Exemple de score" />
          </div>
        </Reveal>
      </section>

      {/* Bénéfices */}
      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal as="h2" className="text-center font-display t-h2 text-balance font-semibold text-text">
            Ce que tu y gagnes
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Tu sais enfin où tu en es.",
                desc: "Fini l'angoisse floue devant le miroir. Tu as un chiffre, une carte, un repère clair.",
              },
              {
                title: "Tu vois un cap concret.",
                desc: "L'aperçu de ton objectif sur ta propre photo, pour savoir où tu vas.",
              },
              {
                title: "Tu avances avec un plan.",
                desc: "Un plan simple sur 30 jours, adapté à ta situation.",
              },
              {
                title: "Tu mesures tes progrès.",
                desc: "Re-scanne chaque mois et regarde ta courbe évoluer.",
              },
            ].map((b, i) => (
              <Reveal key={b.title} delay={(i % 2) * 90} className="group rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card transition-all duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
                <h3 className="text-[17px] font-semibold text-text">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{b.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Preuve sociale (slot honnête) */}
      <section className="border-y border-border bg-surface/40 px-5 py-16">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-pretty text-sm text-text-muted">
            Scalpy est en lancement. Rejoins les premiers utilisateurs et
            découvre ton bilan.
          </p>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal as="h2" className="text-center font-display t-h2 text-balance font-semibold text-text">
            Les questions que tu te poses
          </Reveal>
          <div className="mt-10 space-y-3">
            {[
              {
                q: "C'est un avis médical ?",
                a: "Non. Scalpy situe ta densité, c'est une estimation de bien-être. Ce n'est pas un avis médical et ça ne remplace pas un professionnel de santé.",
              },
              {
                q: "Mes photos sont-elles privées ?",
                a: "Oui. Elles restent privées, hébergées en Europe, jamais partagées. Tu peux les supprimer quand tu veux.",
              },
              {
                q: "C'est gratuit ?",
                a: "Le scan, ton score et l'aperçu de ton objectif sont gratuits, sans carte. Le plan complet et le suivi mensuel sont payants.",
              },
              {
                q: "L'avant/après, c'est mon résultat futur ?",
                a: "Non. C'est une simulation, un objectif visuel. Ce n'est pas une prédiction ni une promesse.",
              },
              {
                q: "Ça prend combien de temps ?",
                a: "Une photo et 30 secondes.",
              },
              {
                q: "C'est fait pour qui ?",
                a: "Pour les hommes qui remarquent une perte et veulent situer où ils en sont, puis suivre leur évolution.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-[var(--radius-lg)] border border-border bg-surface shadow-card transition-colors duration-[var(--dur)] open:border-border-strong hover:border-border-strong">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-text-faint transition-transform duration-[var(--dur)] ease-[var(--ease-out)] group-open:rotate-45 group-open:border-accent group-open:text-accent">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative isolate overflow-hidden px-5 py-24 sm:py-28">
        <div className="contour-bg" />
        <Reveal className="mx-auto max-w-lg text-center">
          <h2 className="font-display t-h1 text-balance font-semibold text-text">
            Prêt à savoir où tu en es ?
          </h2>
          <p className="mt-4 text-text-muted">
            Une photo, 30 secondes. Et tu sais où tu en es.
          </p>
          <div className="mt-8">
            <CtaButton variant={hero.key} />
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-display text-sm font-semibold tracking-[-0.02em] text-text-faint">Scalpy</p>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-text-faint">
            <Link href="/mentions-legales" className="transition-colors hover:text-text-muted">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="transition-colors hover:text-text-muted">
              Confidentialité
            </Link>
            <Link href="/cgu" className="transition-colors hover:text-text-muted">
              CGU
            </Link>
            <a href="mailto:mathias.stephant@gmail.com" className="transition-colors hover:text-text-muted">
              Contact
            </a>
          </div>
        </div>
      </footer>

      <Disclaimer className="mx-auto mb-6 justify-center" />
      <StickyCtaBar variant={hero.key} />
    </main>
    </SmoothScroll>
  );
}
