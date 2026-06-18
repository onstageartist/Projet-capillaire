"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/track";

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Ton point de départ",
    price: null,
    priceLabel: "Gratuit",
    priceSub: null,
    benefits: [
      "Un scan capillaire complet",
      "Score de densité + stade Norwood",
      "Cartographie des zones concernées",
    ],
    cta: "C'est déjà fait",
    disabled: true,
    highlight: false,
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Le choix malin",
    price: null,
    priceLabel: null,
    priceSub: null,
    benefits: [
      "Protocole personnalisé débloqué en entier",
      "Suivi de repousse mois après mois",
      "Sache exactement quoi faire, au bon moment",
      "Vois tes progrès en images comparées",
    ],
    cta: "Choisir cette offre",
    disabled: false,
    highlight: true,
    pricing: {
      monthly: "14,99€/mois",
      yearly: "79€/an",
      yearlySaving: "Économise 44 %",
    },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour ceux qui veulent tout",
    price: "149€",
    priceLabel: "149€/an",
    priceSub: null,
    benefits: [
      "Tout ce qui est dans Plus",
      "Analyses comparatives avancées dans le temps",
      "Suivi de densité zone par zone, scan après scan",
      "Rapports détaillés exportables",
    ],
    cta: "Choisir cette offre",
    disabled: false,
    highlight: false,
  },
];

export default function Plus() {
  const [confirmed, setConfirmed] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("paywall_view");
  }, []);

  function chooseOffer(planId: string) {
    trackEvent("offer_click", { plan: planId });
    setConfirmed(planId);
  }

  if (confirmed) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
            {confirmed === "pro" ? "🚀" : "✨"}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Bientôt disponible
          </h1>
          <p className="text-muted">
            Tu es sur la liste pour l'offre{" "}
            <span className="font-medium text-accent">
              {confirmed === "pro" ? "Pro" : "Plus"}
            </span>
            . On te prévient dès que c'est prêt.
          </p>
          <button
            onClick={() => setConfirmed(null)}
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Retour aux offres
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Choisis ton plan
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Sache exactement quoi faire, et vois ta repousse mois après mois.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.highlight
                  ? "border-accent bg-accent/5 shadow-[0_0_24px_rgba(52,211,153,0.08)]"
                  : "border-border bg-surface"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-background">
                  Recommandé
                </span>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h2>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                {plan.pricing ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {plan.pricing.yearly.replace("/an", "")}
                      </span>
                      <span className="text-sm text-muted">/an</span>
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        {plan.pricing.yearlySaving}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      ou {plan.pricing.monthly}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {plan.priceLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="mt-0.5 shrink-0 text-accent">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => !plan.disabled && chooseOffer(plan.id)}
                disabled={plan.disabled}
                className={`w-full rounded-lg py-3 text-sm font-medium transition-colors ${
                  plan.highlight
                    ? "bg-accent text-background hover:bg-accent-hover"
                    : plan.disabled
                      ? "cursor-default border border-border bg-transparent text-muted"
                      : "border border-border bg-surface text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted">
          Estimation de bien-être basée sur l'analyse visuelle — ceci n'est pas
          un avis médical. Consulte un dermatologue pour un diagnostic clinique.
        </p>
      </div>
    </main>
  );
}
