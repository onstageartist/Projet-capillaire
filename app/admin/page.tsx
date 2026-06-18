"use client";

import { useEffect, useState } from "react";

interface Stats {
  inscriptions: number;
  onboarding: number;
  scans: number;
  paywall_views: number;
  offer_clicks: number;
  offer_detail: { plus: number; pro: number };
}

const CARDS: { key: keyof Stats; label: string }[] = [
  { key: "inscriptions", label: "Inscriptions" },
  { key: "scans", label: "Scans complétés" },
  { key: "onboarding", label: "Onboarding terminés" },
  { key: "paywall_views", label: "Paywall vues" },
  { key: "offer_clicks", label: "Clics sur une offre" },
];

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin")
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 401 ? "Accès réservé." : "Erreur serveur.");
          return;
        }
        setStats(await res.json());
      })
      .catch(() => setError("Impossible de charger les stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-signal">{error}</p>
      </main>
    );
  }

  if (!stats) return null;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
          <p className="mt-1 text-sm text-muted capitalize">{today}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CARDS.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-surface p-4 text-center"
            >
              <p className="text-3xl font-bold text-foreground">
                {stats[key] as number}
              </p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        {stats.offer_clicks > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-3 text-sm font-medium text-muted">
              Détail des offres choisies
            </p>
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg bg-accent/5 p-3 text-center">
                <p className="text-xl font-bold text-accent">
                  {stats.offer_detail.plus}
                </p>
                <p className="text-xs text-muted">Plus</p>
              </div>
              <div className="flex-1 rounded-lg bg-accent/5 p-3 text-center">
                <p className="text-xl font-bold text-accent">
                  {stats.offer_detail.pro}
                </p>
                <p className="text-xs text-muted">Pro</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
