"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { Button, Card, Disclaimer } from "@/components/ui";

type Plan = "monthly" | "annual";

const BENEFITS = [
  "Ton bilan complet et ton stade détaillé",
  "Ton plan personnalisé, sommeil, stress, nutrition, soin du cuir chevelu",
  "Ton objectif en image",
  "Un nouveau scan chaque mois pour suivre ta courbe",
  "Tes zones suivies une par une",
];

export default function Plus() {
  const [objectif, setObjectif] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackEvent("paywall_viewed");

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("onboarding_responses")
        .select("answers")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.answers?.objectif) {
        setObjectif(data.answers.objectif.toLowerCase());
      }
    });
  }, []);

  async function handleCheckout() {
    setLoading(true);
    trackEvent("checkout_started", { plan });

    try {
      const variant = plan === "annual" ? "plus_annual" : "plus_monthly";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: variant }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        {/* Titre dynamique */}
        <div className="text-center">
          <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text sm:text-[30px]">
            Débloque ton plan pour {objectif || "avancer"}
          </h1>
          <p className="mt-2 text-text-muted">
            Ton bilan complet, ton plan personnalisé et ton suivi mois après mois.
          </p>
        </div>

        {/* Sélecteur Mensuel / Annuel */}
        <div className="flex rounded-[12px] border border-border bg-surface p-1">
          <button
            onClick={() => setPlan("monthly")}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-medium transition-all ${
              plan === "monthly"
                ? "bg-surface-2 text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setPlan("annual")}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-medium transition-all ${
              plan === "annual"
                ? "bg-surface-2 text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            <span>Annuel</span>
            <span className="ml-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
              ECO
            </span>
          </button>
        </div>

        {/* Prix */}
        <Card className={`text-center ${plan === "annual" ? "border-accent border-2 shadow-[var(--shadow-accent-glow)]" : ""}`}>
          {plan === "annual" ? (
            <>
              <p className="font-data text-[40px] font-medium leading-none text-text">79 €</p>
              <p className="mt-1 text-sm text-text-muted">/an</p>
              <p className="mt-2 text-sm font-medium text-accent">
                Soit moins de 6,60 € par mois, plus de 50 % d'économie
              </p>
            </>
          ) : (
            <>
              <p className="font-data text-[40px] font-medium leading-none text-text">14,99 €</p>
              <p className="mt-1 text-sm text-text-muted">/mois</p>
            </>
          )}
        </Card>

        {/* Bénéfices */}
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-text-muted">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleCheckout}
          loading={loading}
        >
          Choisir
        </Button>

        {/* Réassurance */}
        <p className="text-center text-xs text-text-faint">
          Paiement sécurisé via Lemon Squeezy. Factures et TVA dans ton espace client.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Annulable à tout moment
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Données privées en Europe
          </span>
        </div>

        <div className="flex justify-center gap-4 text-xs text-text-faint">
          <a href="/cgu" className="hover:text-text-muted">CGU</a>
          <a href="/confidentialite" className="hover:text-text-muted">Confidentialité</a>
        </div>

        <Disclaimer className="justify-center" />
      </div>
    </main>
  );
}
