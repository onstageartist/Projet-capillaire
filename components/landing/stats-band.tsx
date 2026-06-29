"use client";

import { CountUp } from "@/components/ui";

const STATS: { value: number; suffix: string; label: string }[] = [
  { value: 30, suffix: "s", label: "pour ton score" },
  { value: 100, suffix: "", label: "le score de densité max" },
  { value: 3, suffix: "", label: "prises pour cartographier" },
  { value: 12, suffix: " sem.", label: "d'objectif visuel" },
];

export function StatsBand() {
  return (
    <section className="px-5 py-14 sm:py-16">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-y-8 sm:grid-cols-4 sm:divide-x sm:divide-border">
        {STATS.map((s) => (
          <div key={s.label} className="px-4 text-center">
            <p className="font-data text-[clamp(2rem,1.4rem+2vw,2.75rem)] font-semibold leading-none text-text">
              <CountUp value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
