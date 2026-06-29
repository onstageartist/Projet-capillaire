"use client";

import { useEffect, useRef } from "react";

/**
 * Champ de densité : nuage de points (follicules stylisés) reliés, qui dérive
 * lentement. Évoque la mesure de densité capillaire, registre scientifique.
 * Canvas 2D léger (pas de moteur 3D), DPR plafonné, pause hors-écran et en
 * onglet caché, fige une image statique en prefers-reduced-motion.
 */
export function DensityField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = mobile ? 46 : 90;
    const LINK = mobile ? 78 : 104;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let pts: P[] = [];
    let w = 0, h = 0;

    function size() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas!.width = Math.round(w * DPR);
      canvas!.height = Math.round(h * DPR);
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function seed() {
      pts = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.8,
        a: Math.random() * 0.5 + 0.25,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      // liens
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx!.strokeStyle = `rgba(16, 185, 129, ${(1 - d / LINK) * 0.18})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(pts[i].x, pts[i].y);
            ctx!.lineTo(pts[j].x, pts[j].y);
            ctx!.stroke();
          }
        }
      }
      // points
      for (const p of pts) {
        ctx!.fillStyle = `rgba(12, 143, 97, ${p.a})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function step() {
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      draw();
    }

    let raf = 0;
    let running = false;
    function loop() { step(); raf = requestAnimationFrame(loop); }
    function start() { if (!running && !reduce) { running = true; loop(); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size(); seed(); draw();

    if (reduce) {
      // image statique unique
    } else {
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 });
      io.observe(canvas);
      const onVis = () => (document.hidden ? stop() : start());
      document.addEventListener("visibilitychange", onVis);
      const onResize = () => { size(); seed(); draw(); };
      window.addEventListener("resize", onResize);
      return () => {
        stop();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", onResize);
      };
    }
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
