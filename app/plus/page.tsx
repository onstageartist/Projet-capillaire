"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { Button, Card, Disclaimer } from "@/components/ui";

type Plan = "monthly" | "annual";

// Pile de valeur : uniquement ce qui est réellement livré, ancres honnêtes.
const VALUE_STACK = [
  { label: "Ton bilan complet : score, stade et zones", value: "39 €" },
  { label: "Ton plan personnalisé : sommeil, stress, nutrition, soin", value: "49 €" },
  { label: "L'aperçu complet de ton objectif, sur ta photo", value: "19 €" },
  { label: "Ton suivi mensuel et ta courbe de densité", value: "59 €" },
  { label: "Tes zones suivies une par une, dans le temps", value: "29 €" },
];
const TOTAL_VALUE = "195 €";

export default function Plus() {
  const [objectif, setObjectif] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setError("");
    trackEvent("checkout_started", { plan });

    // Timeout : le bouton ne reste jamais bloque sur "chargement".
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    try {
      const variant = plan === "annual" ? "plus_annual" : "plus_monthly";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: variant }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return; // on garde le loading actif pendant la redirection
      }
      // Echec : on le DIT clairement (avant : clic sans rien -> abandon).
      setError(data.error || "Le paiement n'a pas pu démarrer. Réessaie dans un instant.");
      setLoading(false);
    } catch {
      setError("Connexion interrompue. Vérifie ta connexion et réessaie.");
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
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
        <div className="flex rounded-[var(--radius-md)] border border-border bg-surface p-1">
          <button
            onClick={() => setPlan("monthly")}
            className={`flex-1 rounded-[var(--radius-sm)] py-2.5 text-sm font-medium transition-all duration-[var(--dur)] ease-[var(--ease-out)] ${
              plan === "monthly"
                ? "bg-surface-elevated text-text shadow-card"
                : "text-text-muted hover:text-text"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setPlan("annual")}
            className={`flex-1 rounded-[var(--radius-sm)] py-2.5 text-sm font-medium transition-all duration-[var(--dur)] ease-[var(--ease-out)] ${
              plan === "annual"
                ? "bg-surface-elevated text-text shadow-card"
                : "text-text-muted hover:text-text"
            }`}
          >
            <span>Annuel</span>
            <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/20">
              Économise 100 €
            </span>
          </button>
        </div>

        {/* Prix */}
        <Card className={`text-center transition-all duration-[var(--dur)] ease-[var(--ease-out)] ${plan === "annual" ? "border-accent shadow-[var(--shadow-accent-glow)]" : ""}`}>
          {plan === "annual" ? (
            <>
              <p className="font-data text-[40px] font-medium leading-none text-text">79 €</p>
              <p className="mt-1 text-sm text-text-muted">/an</p>
              <p className="mt-2 text-sm font-medium text-accent">
                195 € de valeur, à moins de 6,60 € par mois
              </p>
            </>
          ) : (
            <>
              <p className="font-data text-[40px] font-medium leading-none text-text">14,99 €</p>
              <p className="mt-1 text-sm text-text-muted">/mois</p>
            </>
          )}
        </Card>

        {/* Pile de valeur : tout ce que tu débloques */}
        <Card className="space-y-3">
          <p className="text-sm font-medium text-text">Tout ce que tu débloques</p>
          <ul className="space-y-2.5">
            {VALUE_STACK.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-start gap-2.5 text-text-muted">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {item.label}
                </span>
                <span className="shrink-0 font-data text-xs text-text-faint">{item.value}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="font-medium text-text">Valeur totale</span>
            <span className="font-data font-medium text-text">{TOTAL_VALUE}</span>
          </div>
        </Card>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleCheckout}
          loading={loading}
        >
          Débloquer mon plan
        </Button>

        {error && (
          <p className="text-center text-sm text-danger" role="alert">{error}</p>
        )}

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
