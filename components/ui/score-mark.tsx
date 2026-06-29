interface ScoreMarkProps {
  /** Taille en px */
  size?: number;
  /** Fraction de l'arc remplie (0-1) */
  value?: number;
  /** Animation de balayage continue (loader) */
  spin?: boolean;
  className?: string;
}

/**
 * Motif signature de Scalpy : l'anneau de mesure clinique à graduations.
 * Réutilisé en loader, marqueur de section et mini-indicateur.
 * Statique (SVG natif, zéro dépendance). En reduced-motion, le spin est coupé en CSS.
 */
export function ScoreMark({ size = 24, value = 0.66, spin = false, className = "" }: ScoreMarkProps) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360 * (Math.PI / 180);
    const inner = 16;
    const outer = i % 3 === 0 ? 11 : 13.5;
    return {
      x1: 20 + inner * Math.cos(angle),
      y1: 20 + inner * Math.sin(angle),
      x2: 20 + outer * Math.cos(angle),
      y2: 20 + outer * Math.sin(angle),
      major: i % 3 === 0,
    };
  });

  const r = 16;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - value * arc;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={`${spin ? "motion-safe:animate-spin [animation-duration:2.4s]" : ""} ${className}`}
      aria-hidden="true"
    >
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="var(--border-strong)"
          strokeWidth={t.major ? 1.2 : 0.7}
          strokeLinecap="round"
          opacity={t.major ? 0.9 : 0.5}
        />
      ))}
      <circle
        cx="20" cy="20" r={r}
        stroke="var(--surface-2)" strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${arc} ${circ - arc}`}
        transform="rotate(135 20 20)"
      />
      <circle
        cx="20" cy="20" r={r}
        stroke="var(--accent)" strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${arc} ${circ - arc}`}
        strokeDashoffset={offset}
        transform="rotate(135 20 20)"
      />
      <circle cx="20" cy="20" r="2.4" fill="var(--accent)" />
    </svg>
  );
}
