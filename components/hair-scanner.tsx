"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilesetResolver,
  ImageSegmenter,
  FaceLandmarker,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const HAIR_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const HAIR_CLASS = 1;
const EMERAUDE = [22, 185, 129];
const ALIGN_THRESHOLD = 18;

type Props = {
  onAllCaptured: (photos: string[]) => void;
  onError?: (err: Error) => void;
};

export default function HairScanner({ onAllCaptured, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);

  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const alignedFramesRef = useRef(0);
  const photosRef = useRef<string[]>([]);
  const capturingRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "aligning" | "captured" | "error">("loading");
  const [loadingMsg, setLoadingMsg] = useState("Préparation de la caméra...");
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [alignProgress, setAlignProgress] = useState(0);

  const PHASES = [
    { title: "Prise 1 sur 2", heading: "Cadre le haut de ton crâne", label: "Cadre ton visage de face" },
    { title: "Prise 2 sur 2", heading: "Penche la tête et montre le sommet", label: "Montre le sommet de ton crâne" },
  ];

  const doCapture = useCallback(() => {
    if (capturingRef.current) return;
    capturingRef.current = true;

    const video = videoRef.current!;
    const c = captureRef.current!;
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);

    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    photosRef.current = [...photosRef.current, dataUrl];

    if (photosRef.current.length < PHASES.length) {
      setTimeout(() => {
        setPhase((p) => p + 1);
        setStatus("ready");
        alignedFramesRef.current = 0;
        setAlignProgress(0);
        capturingRef.current = false;
      }, 400);
    } else {
      setStatus("captured");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      onAllCaptured(photosRef.current);
    }
  }, [onAllCaptured]);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const segmenter = segmenterRef.current;
    const face = faceRef.current;
    if (!video || !overlay || !segmenter || capturingRef.current) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (video.currentTime !== lastTimeRef.current && video.videoWidth > 0) {
      lastTimeRef.current = video.currentTime;
      const now = performance.now();

      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      const ctx = overlay.getContext("2d")!;

      try {
        segmenter.segmentForVideo(video, now, (res: ImageSegmenterResult) => {
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          const mask = res.categoryMask;
          if (mask) {
            const data = mask.getAsUint8Array();
            const img = ctx.createImageData(overlay.width, overlay.height);
            for (let i = 0; i < data.length; i++) {
              const p = i * 4;
              if (data[i] === HAIR_CLASS) {
                img.data[p] = EMERAUDE[0];
                img.data[p + 1] = EMERAUDE[1];
                img.data[p + 2] = EMERAUDE[2];
                img.data[p + 3] = 110;
              } else {
                img.data[p + 3] = 0;
              }
            }
            ctx.putImageData(img, 0, 0);
            mask.close();
          }
        });
      } catch {
        // frame skip
      }

      // Auto-capture prise 1 (face) : alignement du visage
      if (photosRef.current.length === 0 && face && !capturingRef.current) {
        try {
          const faceRes = face.detectForVideo(video, now);
          const ok = isWellAligned(faceRes);
          if (ok) {
            alignedFramesRef.current += 1;
            const progress = Math.min(alignedFramesRef.current / ALIGN_THRESHOLD, 1);
            setAlignProgress(progress);
            setStatus("aligning");
            if (alignedFramesRef.current >= ALIGN_THRESHOLD) {
              doCapture();
            }
          } else {
            alignedFramesRef.current = 0;
            setAlignProgress(0);
            setStatus("ready");
          }
        } catch {
          // face detection skip
        }
      }
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [doCapture]);

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted && status === "loading") {
        setStatus("error");
        onError?.(new Error("Chargement trop long. Vérifie ta connexion."));
      }
    }, 45000);

    (async () => {
      try {
        setLoadingMsg("Accès à la caméra...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play();

        if (!mounted) return;
        setLoadingMsg("Chargement des modèles IA...");

        const vision = await FilesetResolver.forVisionTasks(WASM);

        // Segmenter (GPU fallback CPU)
        try {
          segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: HAIR_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: false,
          });
        } catch {
          segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: HAIR_MODEL },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: false,
          });
        }

        // Face Landmarker (GPU fallback CPU)
        try {
          faceRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } catch {
          try {
            faceRef.current = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: FACE_MODEL },
              runningMode: "VIDEO",
              numFaces: 1,
            });
          } catch {
            // Face detection optional, continue without it
          }
        }

        if (!mounted) return;
        clearTimeout(timeout);
        setStatus("ready");
        rafRef.current = requestAnimationFrame(renderLoop);
      } catch (e) {
        console.error("HairScanner error:", e);
        if (!mounted) return;
        clearTimeout(timeout);
        setStatus("error");
        onError?.(e instanceof Error ? e : new Error("Impossible d'initialiser le scanner."));
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPhase = PHASES[phase];

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <p className="text-sm font-medium text-accent">{currentPhase?.title}</p>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-text">
          {currentPhase?.heading}
        </h2>
      </div>

      <div className="relative w-full overflow-hidden rounded-[16px] bg-surface-2">
        <video ref={videoRef} className="w-full" style={{ transform: "scaleX(-1)" }} />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ transform: "scaleX(-1)" }} />
        <canvas ref={captureRef} className="hidden" />

        {flash && <div className="absolute inset-0 bg-white/30 transition-opacity duration-300" />}

        {/* Grille de cadrage */}
        {(status === "ready" || status === "aligning") && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[15%] rounded-full border-2 border-accent/30" />
            <div className="absolute left-1/2 top-[10%] bottom-[10%] w-px -translate-x-1/2 bg-accent/15" />
            <div className="absolute top-1/2 left-[10%] right-[10%] h-px -translate-y-1/2 bg-accent/15" />
          </div>
        )}

        {/* Anneau de progression auto-capture (prise 1) */}
        {phase === 0 && status === "aligning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg className="h-48 w-48" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" strokeWidth="3" strokeOpacity="0.2" />
              <circle
                cx="50" cy="50" r="45"
                fill="none" stroke="var(--accent)" strokeWidth="3"
                strokeDasharray={`${alignProgress * 283} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-200"
              />
            </svg>
          </div>
        )}

        {/* Texte de statut */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span className="rounded-full bg-ink/60 px-4 py-1.5 text-sm font-medium text-text backdrop-blur-sm">
                {loadingMsg}
              </span>
            </div>
          )}
          {status === "ready" && (
            <span className="rounded-full bg-ink/60 px-4 py-1.5 text-sm font-medium text-text backdrop-blur-sm">
              {currentPhase?.label}
            </span>
          )}
          {status === "aligning" && (
            <span className="rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent backdrop-blur-sm">
              Ne bouge pas
            </span>
          )}
          {status === "captured" && (
            <span className="rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent backdrop-blur-sm">
              Capturé
            </span>
          )}
          {status === "error" && (
            <span className="rounded-full bg-danger/20 px-4 py-1.5 text-sm font-medium text-danger backdrop-blur-sm">
              Erreur de chargement
            </span>
          )}
        </div>

        {/* Bouton capture manuelle (toujours dispo en fallback) */}
        {(status === "ready" || status === "aligning") && (
          <button
            onClick={doCapture}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-full border-4 border-accent bg-accent/20 transition-transform active:scale-95"
            aria-label="Capturer"
          >
            <div className="h-12 w-12 rounded-full bg-accent" />
          </button>
        )}
      </div>
    </div>
  );
}

function isWellAligned(res: ReturnType<FaceLandmarker["detectForVideo"]>): boolean {
  if (!res?.faceLandmarks?.length) return false;
  const lm = res.faceLandmarks[0];
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of lm) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const boxW = maxX - minX;
  const centered = Math.abs(cx - 0.5) < 0.2 && Math.abs(cy - 0.5) < 0.2;
  const bigEnough = boxW > 0.2;
  return centered && bigEnough;
}
