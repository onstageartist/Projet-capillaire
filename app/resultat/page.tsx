"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { Gauge, Card, Button, Disclaimer, Badge, ImageSlider } from "@/components/ui";

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
  I: "Pas de recul visible. Ton cuir chevelu est en très bon état.",
  II: "Léger recul de la ligne frontale, souvent le tout premier signe.",
  III: "Recul plus net au niveau des golfes. Le stade où agir fait la différence.",
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
  const [fullProjectionUrl, setFullProjectionUrl] = useState<string | null>(null);
  const [objectif, setObjectif] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectionLoading, setProjectionLoading] = useState(true);

  useEffect(() => {
    trackEvent("result_viewed");

    const supabase = createClient();

    async function loadProjection(userId: string, scanId: string) {
      const { data: proj } = await supabase
        .from("projections")
        .select("teaser_path, full_path, status")
        .eq("user_id", userId)
        .eq("scan_id", scanId)
        .single();

      if (proj?.status === "done") {
        if (proj.teaser_path) {
          const { data: url } = await supabase.storage
            .from("projections")
            .createSignedUrl(proj.teaser_path, 3600);
          if (url?.signedUrl) setTeaserUrl(url.signedUrl);
        }
        if (proj.full_path) {
          const { data: url } = await supabase.storage
            .from("projections")
            .createSignedUrl(proj.full_path, 3600);
          if (url?.signedUrl) setFullProjectionUrl(url.signedUrl);
        }
      }

      const photoPath = sessionStorage.getItem("scanPhotoPath");
      if (photoPath) {
        const { data: origUrl } = await supabase.storage
          .from("scalp-photos")
          .createSignedUrl(photoPath, 3600);
        if (origUrl?.signedUrl) setOriginalUrl(origUrl.signedUrl);
      }

      setProjectionLoading(false);
    }

    async function loadObjectif(userId: string) {
      const { data } = await supabase
        .from("onboarding_responses")
        .select("answers")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.answers?.objectif) {
        setObjectif(data.answers.objectif);
      }
    }

    const cached = sessionStorage.getItem("scanResult");
    if (cached) {
      const parsed = JSON.parse(cached);
      setResult(parsed);
      setLoading(false);

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          if (parsed.scanId) loadProjection(user.id, parsed.scanId);
          loadObjectif(user.id);
        }
      });
      return;
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); setProjectionLoading(false); return; }
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
      } else {
        setProjectionLoading(false);
      }
      loadObjectif(user.id);
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

  const horizonDate = new Date();
  horizonDate.setDate(horizonDate.getDate() + 84);
  const dateStr = horizonDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const hasProjection = originalUrl && (teaserUrl || fullProjectionUrl);

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">

        {/* ─── HERO : Aperçu transformation ─── */}
        <div className="space-y-4">
          <div className="text-center">
            <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text">
              Ton aperçu transformation
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Découvre ce vers quoi tu peux tendre en prenant soin de tes cheveux.
            </p>
          </div>

          {hasProjection ? (
            <ImageSlider
              beforeSrc={originalUrl}
              afterSrc={fullProjectionUrl || teaserUrl!}
              beforeLabel="ACTUELLEMENT"
              afterLabel="APRÈS 12 SEMAINES"
            />
          ) : (
            <div className="relative w-full overflow-hidden rounded-[16px] bg-surface-2 aspect-[3/4] flex items-center justify-center">
              {projectionLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                  <p className="text-sm text-text-faint">Génération de ta projection...</p>
                </div>
              ) : (
                <p className="text-sm text-text-faint px-8 text-center">
                  Projection non disponible pour le moment.
                </p>
              )}
            </div>
          )}

          {/* Carte objectif (style scoremax) */}
          <div className="rounded-[16px] bg-surface-2 border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-text">
                  Ton objectif capillaire
                </span>
              </div>
              <span className="text-xs font-data font-medium text-text-muted">{dateStr}</span>
            </div>

            {objectif && (
              <p className="text-sm text-accent font-medium">{objectif}</p>
            )}

            <div className="flex items-center justify-between text-xs text-text-faint">
              <span>
                Norwood {result.norwood || "?"} — Score {result.score}/100
              </span>
              <span className="font-data font-medium">12 semaines</span>
            </div>

            {/* Mini progress bar */}
            <div className="h-1 w-full rounded-full bg-border">
              <div className="h-1 rounded-full bg-accent" style={{ width: "8%" }} />
            </div>
          </div>

          <p className="text-center text-xs text-signal">
            Simulation d'objectif, pas une promesse de résultat
          </p>
        </div>

        {/* ─── BILAN DÉTAILLÉ ─── */}

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
                <div key={s} className={`flex h-8 flex-1 items-center justify-center rounded-[8px] font-data text-xs font-medium transition-all ${
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

        {/* Recommendations */}
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
            </div>
          </Card>
        )}

        {/* CTA */}
        <Link href="/plus" onClick={() => trackEvent("unlock_click")}>
          <Button variant="primary" size="lg">Continuer</Button>
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
