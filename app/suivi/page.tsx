"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, Button, Gauge, ScoreMark } from "@/components/ui";

interface Scan {
  id: string;
  score: number;
  norwood: string;
  created_at: string;
  zones: string[];
}

export default function Suivi() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("scans")
        .select("id, score, norwood, created_at, zones")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setScans(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <ScoreMark size={44} spin value={0.7} />
        <p className="font-data text-xs uppercase tracking-[0.2em] text-text-faint">Chargement</p>
      </main>
    );
  }

  const latest = scans[scans.length - 1];
  const previous = scans.length > 1 ? scans[scans.length - 2] : null;
  const trend = latest && previous ? latest.score - previous.score : null;

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">Ton suivi</h1>
          <p className="text-sm text-text-muted">
            {scans.length === 0
              ? "Fais ton premier scan pour commencer."
              : `${scans.length} scan${scans.length > 1 ? "s" : ""} enregistré${scans.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {scans.length === 0 && (
          <Card className="text-center space-y-4">
            <p className="text-text-muted">
              Ton suivi commence ici. Fais ton premier scan et reviens chaque
              mois pour voir ta progression.
            </p>
            <Link href="/scan">
              <Button variant="primary" size="md">Faire mon premier scan</Button>
            </Link>
          </Card>
        )}

        {scans.length === 1 && latest && (
          <>
            <Card className="flex flex-col items-center">
              <Gauge score={latest.score} />
              <p className="mt-3 text-sm text-text-muted">
                C'est ton premier scan. Reviens dans 30 jours pour comparer et
                voir ta courbe évoluer.
              </p>
            </Card>
            <Link href="/scan">
              <Button variant="secondary" size="md" className="w-full">
                Refaire un scan
              </Button>
            </Link>
          </>
        )}

        {scans.length >= 2 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <p className="font-data text-[20px] font-medium text-text">{latest!.score}</p>
                <p className="text-xs text-text-faint">Dernier score</p>
              </Card>
              <Card className="text-center">
                <p className={`font-data text-[20px] font-medium ${trend! > 0 ? "text-accent" : trend! < 0 ? "text-signal" : "text-text"}`}>
                  {trend! > 0 ? "+" : ""}{trend}
                </p>
                <p className="text-xs text-text-faint">Évolution</p>
              </Card>
              <Card className="text-center">
                <p className="font-data text-[20px] font-medium text-text">{scans.length}</p>
                <p className="text-xs text-text-faint">Scans</p>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <h2 className="mb-4 text-[17px] font-semibold text-text">
                Évolution du score
              </h2>
              <div className="flex items-end gap-2 h-32">
                {scans.map((scan) => (
                  <div key={scan.id} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-data text-xs text-text-faint">{scan.score}</span>
                    <div
                      className="w-full rounded-t-[var(--radius-sm)] bg-accent transition-all duration-[var(--dur-slow)] ease-[var(--ease-out)]"
                      style={{ height: `${(scan.score / 100) * 100}%` }}
                    />
                    <span className="text-[10px] text-text-faint">
                      {new Date(scan.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Link href="/scan">
              <Button variant="primary" size="lg">
                Faire un nouveau scan
              </Button>
            </Link>
          </>
        )}

        {/* History */}
        {scans.length > 0 && (
          <Card>
            <h2 className="mb-3 text-[17px] font-semibold text-text">Historique</h2>
            <div className="space-y-2">
              {scans.slice().reverse().map((scan) => (
                <div key={scan.id} className="flex items-center justify-between rounded-[8px] border border-border bg-bg px-3 py-2">
                  <span className="text-sm text-text-muted">
                    {new Date(scan.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-data text-sm font-medium text-text">{scan.score}/100</span>
                    {scan.norwood && <Badge variant="accent">{scan.norwood}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
