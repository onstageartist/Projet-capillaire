"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { PriceCard, Card, LockedOverlay, Disclaimer } from "@/components/ui";

export default function Plus() {
  const [objectif, setObjectif] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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

  async function handleSelect(plan: string) {
    setLoading(plan);
    trackEvent("plan_selected", { plan });

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  const objectifLabel = objectif || "avancer";
  const title = `Ton plan pour ${objectifLabel} est prêt.`;

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="w-full max-w-3xl space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-[26px] font-bold text-text sm:text-[34px]">
            {title}
          </h1>
          <p className="mt-2 text-text-muted">
            Débloque ta projection complète, ton protocole personnalisé et ton
            suivi mensuel.
          </p>
        </div>

        {/* Aperçu verrouillé */}
        <div className="grid gap-4 sm:grid-cols-3">
          <LockedOverlay ctaLabel="Débloquer">
            <Card className="h-32 flex items-center justify-center">
              <p className="text-sm text-text-faint">Projection complète</p>
            </Card>
          </LockedOverlay>
          <LockedOverlay ctaLabel="Débloquer">
            <Card className="h-32 flex items-center justify-center">
              <p className="text-sm text-text-faint">Protocole 30 jours</p>
            </Card>
          </LockedOverlay>
          <LockedOverlay ctaLabel="Débloquer">
            <Card className="h-32 flex items-center justify-center">
              <p className="text-sm text-text-faint">Suivi mensuel</p>
            </Card>
          </LockedOverlay>
        </div>

        {/* Offres */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PriceCard
            name="Plus Mensuel"
            price="14,99 €"
            period="mois"
            features={[
              "Projection complète et téléchargeable",
              "Protocole 30 jours personnalisé",
              "Suivi mensuel avec courbe",
            ]}
            onSelect={() => handleSelect("plus_monthly")}
            loading={loading === "plus_monthly"}
          />
          <PriceCard
            name="Plus Annuel"
            price="79 €"
            period="an"
            equivalent="~6,58 €/mois"
            savings="Économie ~56 % vs mensuel"
            badge="Le plus choisi"
            featured
            features={[
              "Projection complète et téléchargeable",
              "Protocole 30 jours personnalisé",
              "Suivi mensuel avec courbe",
            ]}
            onSelect={() => handleSelect("plus_annual")}
            loading={loading === "plus_annual"}
          />
          <PriceCard
            name="Pro"
            price="149 €"
            period="an"
            features={[
              "Tout Plus inclus",
              "Re-scans et projections illimités",
              "Historique et suivi avancés",
              "Accès prioritaire aux nouveautés",
            ]}
            onSelect={() => handleSelect("pro")}
            loading={loading === "pro"}
          />
        </div>

        {/* Preuve sociale */}
        <div className="rounded-[16px] border border-border bg-surface/50 p-5 text-center">
          <p className="text-sm text-text-muted">
            Scalpy est en lancement. Rejoins les premiers utilisateurs et
            prends de l'avance sur ton suivi.
          </p>
        </div>

        {/* Confiance */}
        <div className="flex flex-col items-center gap-3 text-center text-sm text-text-muted">
          <div className="flex flex-wrap justify-center gap-6">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Annulable à tout moment
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Paiement sécurisé
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Données privées en Europe
            </span>
          </div>
          <div className="flex gap-4 text-xs text-text-faint">
            <a href="/cgu" className="hover:text-text-muted">CGU</a>
            <a href="/confidentialite" className="hover:text-text-muted">Confidentialité</a>
          </div>
        </div>

        <Disclaimer className="justify-center" />
      </div>
    </main>
  );
}
