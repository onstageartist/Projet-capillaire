"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { trackEvent } from "@/lib/track";

type Props = {
  beforeUrl: string;
  afterUrl: string;
  locked?: boolean;
  /** position de depart, levier A/B (50 par defaut) */
  start?: number;
  onUnlock?: () => void;
};

/**
 * Comparateur avant/apres. L'apres est un inpainting de l'avant (memes
 * dimensions) donc l'alignement est au pixel. Poignee a portee de pouce,
 * pointer events unifies, clavier + ARIA, badge simulation persistant,
 * verrou pour le gratuit (apres floute). Cadrage toujours positif.
 */
export function BeforeAfter({ beforeUrl, afterUrl, locked = false, start = 55, onUnlock }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(start);
  const [hint, setHint] = useState(true);
  const tracked = useRef(false);

  const setFromX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
    setHint(false);
    if (!tracked.current) {
      tracked.current = true;
      trackEvent("slider_manipulated");
    }
  }, []);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    setFromX(e.clientX);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 3));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 3));
    else if (e.key === "Home") setPos(0);
    else if (e.key === "End") setPos(100);
    else return;
    e.preventDefault();
    setHint(false);
  };

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        role="slider"
        tabIndex={0}
        aria-label="Comparateur, aujourd'hui contre ton objectif visuel simulé"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`Curseur a ${Math.round(pos)} pour cent`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onKeyDown={onKey}
        className="relative aspect-[3/4] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[var(--radius-lg)] border border-border outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        {/* objectif (dessous), en entier, floute si verrouille */}
        <img
          src={afterUrl}
          alt="Objectif visuel simulé"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={locked ? { filter: "blur(9px)", transform: "scale(1.04)" } : undefined}
        />
        {/* aujourd'hui (dessus), coupe selon la poignee */}
        <img
          src={beforeUrl}
          alt="Ta photo actuelle"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />

        {/* etiquettes */}
        <span className="absolute bottom-3 left-3 rounded-[var(--radius-sm)] bg-ink/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          Aujourd'hui
        </span>
        <span className="absolute bottom-3 right-3 rounded-[var(--radius-sm)] bg-ink/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          Ton objectif
        </span>

        {/* badge honnetete, persistant et lisible */}
        <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          Objectif visuel, simulation, pas un résultat promis
        </span>

        {/* poignee, cible tactile large */}
        <div className="absolute bottom-0 top-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_10px_oklch(0_0_0/0.4)]" style={{ left: `${pos}%` }}>
          <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3" /></svg>
          </div>
        </div>

        {hint && (
          <span className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 animate-pulse rounded-full bg-ink/70 px-3 py-1 text-xs text-white backdrop-blur-sm">
            glisse pour voir
          </span>
        )}

        {locked && (
          <button
            type="button"
            onClick={onUnlock}
            className="absolute inset-0 grid place-items-center bg-ink/30 backdrop-blur-[1px]"
          >
            <span className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-pop">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              Débloque ton objectif net
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
