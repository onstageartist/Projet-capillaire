"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ScanResult {
  score: number | null;
  norwood: string;
  zones: string[];
  recommandations: string[];
  message: string;
}

export default function Resultat() {
  const [result, setResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem("scanResult");
    if (data) {
      setResult(JSON.parse(data));
    }
  }, []);

  if (!result) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-muted">Aucun résultat disponible.</p>
        <Link
          href="/scan"
          className="mt-4 text-accent hover:underline"
        >
          Faire un scan
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Ton résultat
        </h1>

        {result.score !== null ? (
          <>
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg border border-border bg-surface p-4 text-center">
                <p className="text-sm text-muted">Densité</p>
                <p className="mt-1 text-3xl font-bold text-accent">
                  {result.score}
                  <span className="text-lg text-muted">/100</span>
                </p>
              </div>
              <div className="flex-1 rounded-lg border border-border bg-surface p-4 text-center">
                <p className="text-sm text-muted">Norwood</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {result.norwood}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-muted">Zones concernées</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.zones.map((zone) => (
                  <span
                    key={zone}
                    className="rounded-md bg-signal/10 px-3 py-1 text-sm text-signal"
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-muted">Recommandations</p>
              <ul className="mt-2 space-y-2">
                {result.recommandations.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-accent">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm text-accent">
              {result.message}
            </p>
          </>
        ) : (
          <p className="text-signal">{result.message}</p>
        )}

        <div className="flex gap-3">
          <Link
            href="/scan"
            className="flex-1 rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Refaire un scan
          </Link>
          <Link
            href="/plus"
            className="flex-1 rounded-lg bg-accent py-3 text-center text-sm font-medium text-background transition-colors hover:bg-accent-hover"
          >
            Voir les offres
          </Link>
        </div>
      </div>
    </main>
  );
}
