"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { Gauge, Card, Button, LockedOverlay, Disclaimer, Badge } from "@/components/ui";

interface ScanResult {
  usable: boolean;
  score: number | null;
  norwood: string | null;
  zones: string[];
  recommendations: string[];
  message: string;
  confidence: string;
  scanId?: string;
}

const NORWOOD_DESC: Record<string, string> = {
  I: "Pas de recul visible — ton cuir chevelu est en très bon état.",
  II: "Léger recul de la ligne frontale, souvent le tout premier signe.",
  III: "Recul plus net au niveau des golfes — le stade où agir fait la différence.",
  IV: "Golfes marqués et début de perte sur le vertex.",
  V: "Les zones dégarnies des golfes et du vertex commencent à se rejoindre.",
  VI: "La bande de cheveux entre les golfes et le vertex a largement disparu.",
  VII: "Perte avancée sur le dessus du crâne, cheveux restants sur les côtés.",
};

type ZoneKey = "golfes" | "vertex" | "frontale" | "tempes" | "général" | "general" | "ligne frontale" | "dessus du crâne";

const ZONE_POSITIONS: Record<ZoneKey, { cx: number; cy: number; rx: number; ry: number }> = {
  golfes: { cx: 100, cy: 52, rx: 55, ry: 18 },
  vertex: { cx: 100, cy: 95, rx: 32, ry: 28 },
  frontale: { cx: 100, cy: 38, rx: 45, ry: 14 },
  "ligne frontale": { cx: 100, cy: 38, rx: 45, ry: 14 },
  "dessus du crâne": { cx: 100, cy: 75, rx: 40, ry: 35 },
  tempes: { cx: 100, cy: 55, rx: 60, ry: 16 },
  général: { cx: 100, cy: 70, rx: 55, ry: 45 },
  general: { cx: 100, cy: 70, rx: 55, ry: 45 },
};

function ScalpMap({ zones }: { zones: string[] }) {
  return (
    <svg viewBox="0 0 200 160" className="mx-auto h-48 w-48">
      <ellipse cx="100" cy="78" rx="65" ry="72" fill="none" stroke="var(--border)" strokeWidth="2" />
      <ellipse cx="33" cy="82" rx="6" ry="14" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <ellipse cx="167" cy="82" rx="6" ry="14" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M 50 55 Q 65 25 100 22 Q 135 25 150 55" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 3" />
      {zones.map((zone) => {
        const key = zone.toLowerCase() as ZoneKey;
        const pos = ZONE_POSITIONS[key];
        if (!pos) return null;
        return (
          <ellipse key={zone} cx={pos.cx} cy={pos.cy} rx={pos.rx} ry={pos.ry}
            fill="var(--signal)" fillOpacity="0.2" stroke="var(--signal)" strokeWidth="1.5" strokeOpacity="0.6" />
        );
      })}
      {zones.map((zone) => {
        const key = zone.toLowerCase() as ZoneKey;
        const pos = ZONE_POSITIONS[key];
        if (!pos) return null;
        return (
          <text key={`l-${zone}`} x={pos.cx} y={pos.cy + 4} textAnchor="middle"
            fill="var(--signal)" fontSize="9" fontWeight="600">{zone}</text>
        );
      })}
    </svg>
  );
}

export default function Resultat() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [teaserUrl, setTeaserUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackEvent("result_viewed");

    const supabase = createClient();

    async function loadProjection(userId: string, scanId: string) {
      const { data: proj } = await supabase
        .from("projections")
        .select("teaser_path, status")
        .eq("user_id", userId)
        .eq("scan_id", scanId)
        .single();

      if (proj?.status === "done" && proj.teaser_path) {
        const { data: url } = await supabase.storage
          .from("projections")
          .createSignedUrl(proj.teaser_path, 3600);
        if (url?.signedUrl) setTeaserUrl(url.signedUrl);
      }

      const photoPath = sessionStorage.getItem("scanPhotoPath");
      if (photoPath) {
        const { data: origUrl } = await supabase.storage
          .from("scalp-photos")
          .createSignedUrl(photoPath, 3600);
        if (origUrl?.signedUrl) setOriginalUrl(origUrl.signedUrl);
      }
    }

    const cached = sessionStorage.getItem("scanResult");
    if (cached) {
      const parsed = JSON.parse(cached);
      setResult(parsed);
      setLoading(false);

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && parsed.scanId) loadProjection(user.id, parsed.scanId);
      });
      return;
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setResult({
          usable: true,
          score: data.score,
          norwood: data.norwood,
          zones: data.zones || [],
          recommendations: data.recommendations || [],
          message: data.message || "",
          confidence: "medium",
          scanId: data.id,
        });
        loadProjection(user.id, data.id);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
      </main>
    );
  }

  if (!result || result.score === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5">
        <p className="text-text-muted">{result?.message || "Aucun résultat disponible."}</p>
        <Link href="/scan" className="mt-4 inline-block rounded-[12px] bg-accent px-6 py-3 text-sm font-semibold text-[#06231A]">
          Faire un scan
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-[26px] font-bold text-text">Ton résultat</h1>
          <p className="mt-1 text-sm text-text-muted">
            Voici où tu en es — c'est ton point de départ.
          </p>
        </div>

        {/* Score */}
        <Card className="flex flex-col items-center">
          <p className="mb-2 text-sm font-medium text-text-muted">Score de densité</p>
          <Gauge score={result.score} />
          {result.message && (
            <p className="mt-3 text-center text-sm text-accent">{result.message}</p>
          )}
        </Card>

        {/* Norwood */}
        {result.norwood && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted">Stade estimé</p>
              <Badge variant="accent">{result.norwood}</Badge>
            </div>
            <p className="mt-3 text-sm text-text-muted">
              {NORWOOD_DESC[result.norwood] || "Stade estimé."}
            </p>
            <div className="mt-4 flex gap-1">
              {["I", "II", "III", "IV", "V", "VI", "VII"].map((s) => (
                <div key={s} className={`flex h-8 flex-1 items-center justify-center rounded-[8px] text-xs font-medium transition-all ${
                  s === result.norwood ? "bg-accent text-[#06231A]" : "bg-border/50 text-text-faint"
                }`}>
                  {s}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Zones */}
        {result.zones.length > 0 && (
          <Card>
            <p className="mb-4 text-sm font-medium text-text-muted">Zones concernées</p>
            <ScalpMap zones={result.zones} />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {result.zones.map((z) => (
                <Badge key={z} variant="signal">{z}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Projection teaser (locked) */}
        <LockedOverlay ctaLabel="Débloquer ma projection" href="/plus">
          <Card>
            <p className="text-sm font-medium text-text-muted mb-3">
              Ta projection avant/après
            </p>
            {teaserUrl && originalUrl ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <img src={originalUrl} alt="Avant" className="rounded-[12px] w-full" />
                  <p className="mt-1 text-center text-xs text-text-faint">Avant</p>
                </div>
                <div>
                  <img src={teaserUrl} alt="Objectif" className="rounded-[12px] w-full blur-sm" />
                  <p className="mt-1 text-center text-xs text-text-faint">Objectif</p>
                </div>
              </div>
            ) : teaserUrl ? (
              <img src={teaserUrl} alt="Projection" className="rounded-[12px] w-full blur-sm" />
            ) : (
              <div className="h-40 rounded-[12px] bg-surface-2 flex items-center justify-center">
                <p className="text-sm text-text-faint">Projection en cours de génération...</p>
              </div>
            )}
            <p className="mt-2 text-xs text-signal text-center">
              Simulation — objectif visuel, pas une prédiction
            </p>
          </Card>
        </LockedOverlay>

        {/* Recommendations - 2 visible, rest locked */}
        {result.recommendations.length > 0 && (
          <Card>
            <p className="mb-4 text-sm font-medium text-text-muted">
              Ton protocole personnalisé
            </p>
            <div className="space-y-3">
              {result.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="flex gap-3 rounded-[12px] border border-border bg-bg p-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <p className="text-sm text-text">{rec}</p>
                </div>
              ))}
              {result.recommendations.length > 2 && (
                <LockedOverlay ctaLabel="Voir le protocole complet" href="/plus">
                  <div className="space-y-3">
                    {result.recommendations.slice(2).map((rec, i) => (
                      <div key={i} className="flex gap-3 rounded-[12px] border border-border bg-bg p-3">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <p className="text-sm text-text">{rec}</p>
                      </div>
                    ))}
                  </div>
                </LockedOverlay>
              )}
            </div>
          </Card>
        )}

        {/* Locked suivi preview */}
        <LockedOverlay ctaLabel="Débloquer le suivi mensuel" href="/plus">
          <Card>
            <p className="text-sm font-medium text-text-muted mb-3">Ton suivi mensuel</p>
            <div className="h-24 rounded-[12px] bg-surface-2 flex items-center justify-center">
              <p className="text-sm text-text-faint">Courbe d'évolution du score</p>
            </div>
          </Card>
        </LockedOverlay>

        {/* CTA */}
        <Link href="/plus" onClick={() => trackEvent("unlock_click")}>
          <Button variant="primary" size="lg">Débloquer mon plan</Button>
        </Link>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/scan" className="flex-1">
            <Button variant="secondary" size="md" className="w-full">Refaire un scan</Button>
          </Link>
          <Link href="/suivi" className="flex-1">
            <Button variant="ghost" size="md" className="w-full">Mon suivi</Button>
          </Link>
        </div>

        <Disclaimer className="justify-center" />
      </div>
    </main>
  );
}
