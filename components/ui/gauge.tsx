"use client";

import { useEffect, useState } from "react";

interface GaugeProps {
  score: number;
  label?: string;
}

function statusOf(score: number): { color: string; word: string } {
  if (score >= 70) return { color: "var(--accent)", word: "Bonne densité" };
  if (score >= 40) return { color: "var(--signal)", word: "Densité modérée" };
  return { color: "var(--danger)", word: "Densité fragile" };
}

function Gauge({ score, label = "Score de densité" }: GaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setAnimated(score);
      return;
    }
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

  const r = 54;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const offset = arcLength - (animated / 100) * arcLength;
  const { color, word } = statusOf(score);

  // Graduations sur l'arc (effet instrument clinique)
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const frac = i / 10;
    // L'arc va de 135° à 135°+270° (sens horaire)
    const angle = (135 + frac * 270) * (Math.PI / 180);
    const inner = 44;
    const outer = i % 5 === 0 ? 38 : 41;
    return {
      x1: 60 + inner * Math.cos(angle),
      y1: 60 + inner * Math.sin(angle),
      x2: 60 + outer * Math.cos(angle),
      y2: 60 + outer * Math.sin(angle),
      major: i % 5 === 0,
    };
  });

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 120 120" className="h-44 w-44">
        {/* Graduations */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="var(--border-strong)"
            strokeWidth={t.major ? 1.4 : 0.8}
            strokeLinecap="round"
            opacity={t.major ? 0.9 : 0.5}
          />
        ))}
        {/* Piste */}
        <circle
          cx="60" cy="60" r={r}
          fill="none" stroke="var(--surface-2)" strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          transform="rotate(135 60 60)"
        />
        {/* Arc de score */}
        <circle
          cx="60" cy="60" r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={offset}
          transform="rotate(135 60 60)"
          className="transition-all duration-[1.2s]"
          style={{
            transitionTimingFunction: "var(--ease-out)",
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-data text-[38px] font-semibold leading-none" style={{ color }}>
          {animated}
        </span>
        <span className="mt-1 font-data text-sm text-text-faint">/ 100</span>
      </div>
      <div className="mt-2 flex flex-col items-center gap-0.5">
        <span className="text-[13px] font-medium" style={{ color }}>{word}</span>
        <span className="text-xs text-text-faint">{label}</span>
      </div>
    </div>
  );
}

export { Gauge };
