"use client";

import Link from "next/link";
import { Gauge, Disclaimer } from "@/components/ui";
import { trackEvent } from "@/lib/track";
import { useEffect, useState } from "react";

function CtaButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/onboarding"
      onClick={() => trackEvent("cta_scan_click")}
      className={`inline-block rounded-[16px] bg-accent px-8 py-4 text-lg font-semibold text-[#06231A] shadow-[0_0_32px_rgba(22,185,129,0.15)] transition-all hover:bg-accent-hover hover:shadow-[0_0_48px_rgba(22,185,129,0.25)] ${className}`}
    >
      Faire mon scan gratuit
    </Link>
  );
}

function StickyCtaBar() {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 p-3 backdrop-blur-md sm:hidden">
      <Link
        href="/onboarding"
        onClick={() => trackEvent("cta_scan_click")}
        className="block w-full rounded-[16px] bg-accent py-3.5 text-center text-base font-semibold text-[#06231A]"
      >
        Faire mon scan gratuit
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section id="hero" className="flex flex-col items-center px-5 pb-16 pt-20 sm:pt-28">
        <h1 className="max-w-2xl text-center text-[34px] font-bold leading-[1.1] tracking-[-0.01em] text-text sm:text-[44px]">
          Scanne ton crâne. Sache où tu en es, et ce vers quoi tu peux tendre.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-center text-base leading-relaxed text-text-muted">
          Une photo, 30 secondes. Ton score de densité, tes zones fragiles, et
          un objectif visuel de ta densité retrouvée. Gratuit, sans clinique.
        </p>
        <div className="mt-10">
          <CtaButton />
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
            "Tes photos restent privées, hébergées en Europe",
            "Gratuit pour commencer",
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
      <section className="px-5 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-[20px] font-semibold text-text sm:text-[26px]">
            Comment ça marche
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                num: "1",
                title: "Scanne.",
                desc: "Prends ton cuir chevelu en photo. On t'en donne un score de densité, ton stade et tes zones fragiles.",
              },
              {
                num: "2",
                title: "Visualise.",
                desc: "Découvre un objectif visuel de ta densité retrouvée, sur ta propre photo.",
              },
              {
                num: "3",
                title: "Suis.",
                desc: "Reçois un protocole sur 30 jours et re-scanne chaque mois pour voir ta progression.",
              },
            ].map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-lg font-bold text-accent">
                  {s.num}
                </div>
                <h3 className="mt-4 text-[17px] font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo du scan */}
      <section className="border-y border-border bg-surface/50 px-5 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-[20px] font-semibold text-text sm:text-[26px]">
            Le scan qui te dit tout
          </h2>
          <p className="mt-3 text-sm text-text-muted">
            En une photo, l'analyse repère ta densité, tes zones dégarnies et
            ton stade. Tu vois enfin clair, en quelques secondes.
          </p>
          <div className="mt-10 flex justify-center">
            <Gauge score={72} label="Exemple de score" />
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-[20px] font-semibold text-text sm:text-[26px]">
            Ce que tu y gagnes
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Tu sais enfin où tu en es.",
                desc: "Fini l'angoisse floue devant le miroir. Tu as un chiffre, une carte, un repère clair.",
              },
              {
                title: "Tu vois un cap concret.",
                desc: "Un objectif visuel sur ta propre photo, pour savoir vers quoi tu avances.",
              },
              {
                title: "Tu avances avec un plan.",
                desc: "Un protocole simple sur 30 jours, pensé pour ta situation.",
              },
              {
                title: "Tu mesures tes progrès.",
                desc: "Re-scanne chaque mois et regarde ta courbe évoluer.",
              },
            ].map((b) => (
              <div key={b.title} className="rounded-[16px] border border-border bg-surface p-5">
                <h3 className="text-[17px] font-semibold text-text">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preuve sociale (slot honnête) */}
      <section className="border-y border-border bg-surface/50 px-5 py-16">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm text-text-muted">
            Scalpy est en lancement. Rejoins les premiers utilisateurs et
            découvre ton bilan.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-[20px] font-semibold text-text sm:text-[26px]">
            Les questions que tu te poses
          </h2>
          <div className="mt-10 space-y-3">
            {[
              {
                q: "C'est un diagnostic médical ?",
                a: "Non. Scalpy est un outil de bien-être qui te donne une estimation indicative. Ce n'est pas un avis médical et ça ne remplace pas un professionnel de santé.",
              },
              {
                q: "Mes photos sont-elles en sécurité ?",
                a: "Oui. Elles sont stockées de façon privée, hébergées en Europe, et jamais partagées. Tu peux les supprimer quand tu veux.",
              },
              {
                q: "C'est vraiment gratuit ?",
                a: "Le scan, ton score et un aperçu de ta projection sont gratuits. Le protocole complet et le suivi mensuel sont dans l'offre payante.",
              },
              {
                q: "L'avant/après, c'est mon vrai résultat futur ?",
                a: "Non. C'est une simulation, un objectif visuel de ce que pourrait donner une densité retrouvée. Ce n'est pas une prédiction ni une garantie.",
              },
              {
                q: "Ça prend combien de temps ?",
                a: "Environ 30 secondes et une photo.",
              },
              {
                q: "C'est fait pour qui ?",
                a: "Pour les hommes qui remarquent une perte et veulent comprendre où ils en sont et suivre leur évolution.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-[16px] border border-border bg-surface">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-text">
                  {faq.q}
                  <span className="ml-4 shrink-0 text-text-faint transition-transform group-open:rotate-45">
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
      <section className="px-5 py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-[20px] font-semibold text-text sm:text-[26px]">
            Prêt à savoir où tu en es ?
          </h2>
          <p className="mt-4 text-text-muted">
            Une photo, 30 secondes. Tu verras.
          </p>
          <div className="mt-8">
            <CtaButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm font-bold tracking-[-0.01em] text-text-faint">Scalpy</p>
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
      <StickyCtaBar />
    </main>
  );
}
