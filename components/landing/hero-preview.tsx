"use client";

import { Gauge } from "@/components/ui";

/**
 * Ancrage visuel du hero : un aperçu produit (la carte de bilan) qui montre
 * concretement ce que l'utilisateur recoit. Donnees d'exemple, badge simulation.
 */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Carte bilan */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </span>
            <span className="text-sm font-semibold text-text">Ton bilan</span>
          </div>
          <span className="font-data text-xs text-text-faint">Exemple</span>
        </div>

        <div className="mt-2 flex justify-center">
          <Gauge score={72} label="Score de densité" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-md)] border border-border bg-bg p-3 text-center">
            <p className="font-data text-lg font-semibold text-text">III</p>
            <p className="text-xs text-text-faint">Stade estimé</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-bg p-3 text-center">
            <p className="font-data text-lg font-semibold text-text">2</p>
            <p className="text-xs text-text-faint">Zones suivies</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {["Golfes", "Vertex"].map((z) => (
            <span key={z} className="rounded-full bg-signal/10 px-2.5 py-0.5 text-xs font-medium text-signal ring-1 ring-inset ring-signal/20">{z}</span>
          ))}
        </div>
      </div>

      {/* Vignette avant / apres flottante */}
      <div className="absolute -bottom-9 -right-2 w-32 rotate-3 rounded-[var(--radius-lg)] border border-border bg-surface p-2 shadow-pop sm:-right-12 sm:w-36">
        <div className="grid grid-cols-2 gap-1">
          <div className="aspect-[3/4] rounded-[var(--radius-sm)] bg-gradient-to-br from-surface-2 to-border" />
          <div className="aspect-[3/4] rounded-[var(--radius-sm)] bg-gradient-to-br from-accent-soft to-accent/20" />
        </div>
        <p className="mt-1.5 text-center text-[10px] font-medium text-signal">Simulation, objectif visuel</p>
      </div>
    </div>
  );
}
