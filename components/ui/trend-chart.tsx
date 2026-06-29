"use client";

import { useEffect, useRef, useState } from "react";

interface TrendPoint {
  score: number;
  label: string;
}

interface TrendChartProps {
  points: TrendPoint[];
}

/**
 * Courbe d'évolution d'un score 0-100, registre clinique.
 * Axe Y fixe 0-100 (jamais d'auto-zoom), bandes de référence très peu
 * saturées, ligne émeraude, dernier point en halo, chiffres tabulaires.
 * Trace animé au montage (coupé en reduced-motion). SVG natif, zéro lib.
 */
export function TrendChart({ points }: TrendChartProps) {
  const [draw, setDraw] = useState(0); // 0 -> 1, progression du tracé
  const pathRef = useRef<SVGPolylineElement>(null);

  const W = 320, H = 168;
  const padX = 12, padTop = 14, padBottom = 30;
  const chartW = W - padX * 2;
  const chartH = H - padTop - padBottom;

  const n = points.length;
  const x = (i: number) => padX + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const y = (s: number) => padTop + (1 - Math.max(0, Math.min(100, s)) / 100) * chartH;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDraw(1); return; }
    const dur = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDraw(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points]);

  const linePts = points.map((p, i) => `${x(i)},${y(p.score)}`).join(" ");
  const areaPts = `${x(0)},${y(0) + 0} ${linePts} ${x(n - 1)},${padTop + chartH}`;
  const last = points[n - 1];
  const first = points[0];

  const dash = pathRef.current?.getTotalLength?.() ?? 600;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Évolution du score, du premier (${first?.score}) au dernier (${last?.score}) sur 100`}
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bandes de référence (faible / modérée / bonne), très peu saturées */}
      <rect x="0" y={y(100)} width={W} height={y(70) - y(100)} fill="var(--accent)" opacity="0.05" />
      <rect x="0" y={y(70)} width={W} height={y(40) - y(70)} fill="var(--signal)" opacity="0.04" />
      <rect x="0" y={y(40)} width={W} height={y(0) - y(40)} fill="var(--danger)" opacity="0.05" />

      {/* Lignes de repère 0 / 50 / 100 */}
      {[0, 50, 100].map((s) => (
        <line key={s} x1={padX} x2={W - padX} y1={y(s)} y2={y(s)} stroke="var(--border)" strokeWidth="0.6" strokeDasharray="2 3" />
      ))}

      {n >= 2 && (
        <>
          {/* Aire sous la courbe */}
          <polygon points={areaPts} fill="url(#trend-fill)" opacity={draw} />
          {/* Courbe (tracé animé) */}
          <polyline
            ref={pathRef}
            points={linePts}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              strokeDasharray: dash,
              strokeDashoffset: dash * (1 - draw),
            }}
          />
        </>
      )}

      {/* Points */}
      {points.map((p, i) => {
        const isLast = i === n - 1;
        return (
          <g key={i} opacity={draw}>
            {isLast && <circle cx={x(i)} cy={y(p.score)} r="7" fill="var(--accent)" opacity="0.18" />}
            <circle cx={x(i)} cy={y(p.score)} r={isLast ? 4 : 3} fill={isLast ? "var(--accent-light)" : "var(--accent)"} stroke="var(--bg)" strokeWidth="1.5" />
          </g>
        );
      })}

      {/* Étiquettes de valeur : premier et dernier */}
      {n >= 1 && (
        <text x={x(0)} y={y(first.score) - 10} textAnchor="middle" className="font-data" fill="var(--text-faint)" fontSize="10">{first.score}</text>
      )}
      {n >= 2 && (
        <text x={x(n - 1)} y={y(last.score) - 12} textAnchor="middle" className="font-data" fill="var(--text)" fontSize="12" fontWeight="600">{last.score}</text>
      )}

      {/* Étiquettes de date : premier et dernier */}
      {n >= 1 && (
        <text x={x(0)} y={H - 10} textAnchor={n >= 2 ? "start" : "middle"} fill="var(--text-faint)" fontSize="9">{first.label}</text>
      )}
      {n >= 2 && (
        <text x={x(n - 1)} y={H - 10} textAnchor="end" fill="var(--text-faint)" fontSize="9">{last.label}</text>
      )}
    </svg>
  );
}
