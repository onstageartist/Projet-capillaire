"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Scan {
  id: string;
  date: string;
  score: number;
  norwood: number;
  zones: string[];
  photo_url: string;
}

const NORWOOD_LABEL: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ScoreChart({ scans }: { scans: Scan[] }) {
  const points = scans.slice().reverse();
  if (points.length < 2) return null;

  const maxScore = 100;
  const w = 300;
  const h = 120;
  const px = 32;
  const py = 16;
  const innerW = w - px * 2;
  const innerH = h - py * 2;

  const coords = points.map((s, i) => ({
    x: px + (i / (points.length - 1)) * innerW,
    y: py + innerH - (s.score / maxScore) * innerH,
    score: s.score,
    date: s.date,
  }));

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${h - py} L ${coords[0].x} ${h - py} Z`;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-medium text-muted">
        Évolution du score de densité
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = py + innerH - (v / maxScore) * innerH;
          return (
            <g key={v}>
              <line
                x1={px}
                y1={y}
                x2={w - px}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
              />
              <text
                x={px - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--muted)"
                fontSize="7"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="var(--accent)" fillOpacity="0.08" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="4" fill="var(--background)" stroke="var(--accent)" strokeWidth="2" />
            <text
              x={c.x}
              y={c.y - 8}
              textAnchor="middle"
              fill="var(--accent)"
              fontSize="7"
              fontWeight="600"
            >
              {c.score}
            </text>
          </g>
        ))}

        {/* Date labels */}
        {coords
          .filter((_, i) => i === 0 || i === coords.length - 1 || coords.length <= 5)
          .map((c, i) => (
            <text
              key={`d-${i}`}
              x={c.x}
              y={h - 2}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="6"
            >
              {new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </text>
          ))}
      </svg>
    </div>
  );
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-muted">= stable</span>;
  return (
    <span className={`text-xs font-medium ${diff > 0 ? "text-accent" : "text-signal"}`}>
      {diff > 0 ? "↑" : "↓"} {Math.abs(diff)} pts
    </span>
  );
}

export default function Suivi() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
        .limit(20);

      if (data) setScans(data);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
      </main>
    );
  }

  if (scans.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
            📊
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Aucun scan pour l'instant
          </h1>
          <p className="text-muted">
            Fais ton premier scan pour commencer à suivre ta repousse.
          </p>
          <Link
            href="/scan"
            className="inline-block rounded-lg bg-accent px-8 py-3 font-medium text-background transition-colors hover:bg-accent-hover"
          >
            Faire mon scan
          </Link>
        </div>
      </main>
    );
  }

  const latest = scans[0];
  const previous = scans.length > 1 ? scans[1] : null;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ton suivi</h1>
          <p className="mt-1 text-sm text-muted">
            {scans.length} scan{scans.length > 1 ? "s" : ""} enregistré{scans.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{latest.score}</p>
            <p className="mt-1 text-xs text-muted">Dernier score</p>
            {previous && (
              <div className="mt-1">
                <TrendBadge current={latest.score} previous={previous.score} />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {NORWOOD_LABEL[latest.norwood] || "?"}
            </p>
            <p className="mt-1 text-xs text-muted">Stade Norwood</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{scans.length}</p>
            <p className="mt-1 text-xs text-muted">Scans total</p>
          </div>
        </div>

        {/* Chart */}
        <ScoreChart scans={scans} />

        {scans.length === 1 && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 text-center">
            <p className="text-sm font-medium text-accent">
              Reviens dans un mois pour mesurer ta progression.
            </p>
            <p className="mt-1 text-xs text-muted">
              On comparera tes scores et tu verras l'évolution de ta densité.
            </p>
          </div>
        )}

        {/* Scan history */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">Historique</p>
          {scans.map((scan, i) => (
            <div
              key={scan.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    scan.score >= 70
                      ? "bg-accent/10 text-accent"
                      : scan.score >= 40
                        ? "bg-signal/10 text-signal"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {scan.score}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(scan.date)}
                  </p>
                  <p className="text-xs text-muted">
                    Norwood {NORWOOD_LABEL[scan.norwood] || "?"} · {scan.zones?.length || 0} zone{(scan.zones?.length || 0) > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {i > 0 && (
                <TrendBadge current={scan.score} previous={scans[i - 1].score} />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <Link
            href="/scan"
            className="flex-1 rounded-lg bg-accent py-3 text-center text-sm font-medium text-background transition-colors hover:bg-accent-hover"
          >
            Nouveau scan
          </Link>
          <Link
            href="/plus"
            className="flex-1 rounded-lg border border-border py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Débloquer le suivi avancé
          </Link>
        </div>

        <p className="text-center text-xs text-muted">
          Estimation de bien-être basée sur l'analyse visuelle — ceci n'est pas
          un avis médical. Consulte un dermatologue pour un diagnostic clinique.
        </p>
      </div>
    </main>
  );
}
