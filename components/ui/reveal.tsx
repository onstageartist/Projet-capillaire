"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Délai d'apparition en ms (pour cascade douce) */
  delay?: number;
  /** Balise rendue (div par défaut) */
  as?: ElementType;
  className?: string;
}

/**
 * Révélation au scroll : fondu + léger glissement vers le haut.
 * Piloté par IntersectionObserver, zéro dépendance.
 * En reduced-motion, le contenu est visible immédiatement (géré en CSS).
 */
export function Reveal({ children, delay = 0, as, className = "" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const Tag = (as ?? "div") as ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => el.classList.add("is-visible");

    // Déjà dans la fenêtre au chargement (ou IO indisponible) : on révèle tout
    // de suite (la transition CSS joue quand même). Garantit zéro contenu
    // invisible, même si l'observer tarde.
    const inView = el.getBoundingClientRect().top < window.innerHeight * 0.95;
    if (inView || typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
