"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

interface ScanResult {
  score: number | null;
  norwood: string;
  zones: string[];
  recommandations: string[];
  message: string;
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

type ZoneKey = "golfes" | "vertex" | "frontale" | "tempes" | "général" | "general" | "ligne frontale";

const ZONE_POSITIONS: Record<ZoneKey, { cx: number; cy: number; rx: number; ry: number }> = {
  golfes: { cx: 100, cy: 52, rx: 55, ry: 18 },
  vertex: { cx: 100, cy: 95, rx: 32, ry: 28 },
  frontale: { cx: 100, cy: 38, rx: 45, ry: 14 },
  "ligne frontale": { cx: 100, cy: 38, rx: 45, ry: 14 },
  tempes: { cx: 100, cy: 55, rx: 60, ry: 16 },
  général: { cx: 100, cy: 70, rx: 55, ry: 45 },
  general: { cx: 100, cy: 70, rx: 55, ry: 45 },
};

function ScalpMap({ zones }: { zones: string[] }) {
  return (
    <svg viewBox="0 0 200 160" className="mx-auto h-48 w-48">
      {/* Head outline */}
      <ellipse
        cx="100"
        cy="78"
        rx="65"
        ry="72"
        fill="none"
        stroke="var(--border)"
        strokeWidth="2"
      />
      {/* Ears */}
      <ellipse cx="33" cy="82" rx="6" ry="14" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <ellipse cx="167" cy="82" rx="6" ry="14" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      {/* Hair line */}
      <path
        d="M 50 55 Q 65 25 100 22 Q 135 25 150 55"
        fill="none"
        stroke="var(--border)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* Zone highlights */}
      {zones.map((zone) => {
        const key = zone.toLowerCase() as ZoneKey;
        const pos = ZONE_POSITIONS[key];
        if (!pos) return null;
        return (
          <ellipse
            key={zone}
            cx={pos.cx}
            cy={pos.cy}
            rx={pos.rx}
            ry={pos.ry}
            fill="var(--signal)"
            fillOpacity="0.2"
            stroke="var(--signal)"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            className="animate-pulse"
          />
        );
      })}
      {/* Zone labels */}
      {zones.map((zone) => {
        const key = zone.toLowerCase() as ZoneKey;
        const pos = ZONE_POSITIONS[key];
        if (!pos) return null;
        return (
          <text
            key={`label-${zone}`}
            x={pos.cx}
            y={pos.cy + 4}
            textAnchor="middle"
            fill="var(--signal)"
            fontSize="9"
            fontWeight="600"
          >
            {zone}
          </text>
        );
      })}
    </svg>
  );
}

function DensityGauge({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated(Math.round(ease * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (animated / 100) * circumference * 0.75;
  const color =
    score >= 70 ? "var(--accent)" : score >= 40 ? "var(--signal)" : "#ef4444";

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 120 120" className="h-40 w-40">
        {/* Background arc */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          transform="rotate(135 60 60)"
        />
        {/* Score arc */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(135 60 60)"
          className="transition-all duration-[1.5s] ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold transition-all duration-[1.5s]"
          style={{ color }}
        >
          {animated}
        </span>
        <span className="text-sm text-muted">/100</span>
      </div>
    </div>
  );
}

export default function Resultat() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  useEffect(() => {
    async function loadResult() {
      // Try sessionStorage first (just scanned)
      const cached = sessionStorage.getItem("scanResult");
      if (cached) {
        setResult(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Otherwise load last scan from Supabase
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const norwoodReverse: Record<number, string> = {
          1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII",
        };
        setResult({
          score: data.score,
          norwood: norwoodReverse[data.norwood] || "?",
          zones: data.zones || [],
          recommandations: [],
          message: "",
        });
      }

      setLoading(false);
    }

    loadResult();
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
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-muted">
          {result?.message || "Aucun résultat disponible."}
        </p>
        <Link href="/scan" className="mt-4 text-accent hover:underline">
          Faire un scan
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Ton résultat
          </h1>
          <p className="mt-1 text-sm text-muted">
            Voici où tu en es — c'est ton point de départ.
          </p>
        </div>

        {/* Score gauge */}
        <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-6">
          <p className="mb-2 text-sm font-medium text-muted">
            Score de densité
          </p>
          <DensityGauge score={result.score} />
          <p className="mt-2 text-center text-sm text-accent">
            {result.message}
          </p>
        </div>

        {/* Norwood */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Stade Norwood</p>
            <span className="rounded-md bg-foreground/10 px-3 py-1 text-lg font-bold text-foreground">
              {result.norwood}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">
            {NORWOOD_DESC[result.norwood] || "Stade estimé."}
          </p>
          {/* Scale visualization */}
          <div className="mt-4 flex gap-1">
            {["I", "II", "III", "IV", "V", "VI", "VII"].map((stage) => (
              <div
                key={stage}
                className={`flex h-8 flex-1 items-center justify-center rounded text-xs font-medium transition-all ${
                  stage === result.norwood
                    ? "bg-accent text-background"
                    : "bg-border/50 text-muted"
                }`}
              >
                {stage}
              </div>
            ))}
          </div>
        </div>

        {/* Scalp map */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-4 text-sm font-medium text-muted">
            Zones concernées
          </p>
          <ScalpMap zones={result.zones} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {result.zones.map((zone) => (
              <span
                key={zone}
                className="rounded-full bg-signal/10 px-3 py-1 text-xs font-medium text-signal"
              >
                {zone}
              </span>
            ))}
          </div>
        </div>

        {/* Recommendations — 2 visible, rest blurred */}
        {result.recommandations.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-4 text-sm font-medium text-muted">
              Ton protocole personnalisé
            </p>
            <div className="space-y-3">
              {result.recommandations.slice(0, 2).map((rec, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <span className="mt-0.5 text-accent">✓</span>
                  <p className="text-sm text-foreground">{rec}</p>
                </div>
              ))}
              {result.recommandations.length > 2 && (
                <div className="relative">
                  <div className="space-y-3 blur-[6px] select-none">
                    {result.recommandations.slice(2).map((rec, i) => (
                      <div
                        key={i}
                        className="flex gap-3 rounded-lg border border-border bg-background p-3"
                      >
                        <span className="mt-0.5 text-accent">✓</span>
                        <p className="text-sm text-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl">🔒</span>
                    <Link
                      href="/plus"
                      className="mt-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
                    >
                      Débloquer mon protocole complet
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/scan"
            className="flex-1 rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Refaire un scan
          </Link>
          <Link
            href="/suivi"
            className="flex-1 rounded-lg bg-accent py-3 text-center text-sm font-medium text-background transition-colors hover:bg-accent-hover"
          >
            Voir mon suivi
          </Link>
        </div>

        <button
          onClick={async () => {
            const text = `Mon scan Scalpy : ${result.score}/100, Norwood ${result.norwood}`;
            if (navigator.share) {
              await navigator.share({
                title: "Mon scan Scalpy",
                text,
                url: window.location.origin,
              });
            } else {
              await navigator.clipboard.writeText(`${text} — ${window.location.origin}`);
              show("Résultat copié !");
            }
          }}
          className="w-full rounded-lg border border-border py-2.5 text-center text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          Partager mon résultat
        </button>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted">
          Estimation de bien-être basée sur l'analyse visuelle — ceci n'est pas
          un avis médical. Consulte un dermatologue pour un diagnostic clinique.
        </p>
      </div>
    </main>
  );
}
