"use client";

import { ReactLenis } from "lenis/react";
import { useEffect, useState } from "react";

/**
 * Défilement doux (Lenis) pour les pages vitrine uniquement.
 * Démonté proprement si l'utilisateur demande moins de mouvement
 * (on rend alors le scroll natif). Lenis pilote son propre RAF.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.1,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
