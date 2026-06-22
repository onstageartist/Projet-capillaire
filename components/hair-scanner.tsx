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
const STABLE_FRAMES = 20;
const MIN_HAIR_RATIO = 0.04;
const FACE_DETECT_INTERVAL = 100;

type Props = {
  onAllCaptured: (photos: string[]) => void;
  onError?: (err: Error) => void;
};

const PHASES = [
  { title: "Prise 1 sur 2", heading: "Cadre ton visage de face", label: "Centre ton visage" },
  { title: "Prise 2 sur 2", heading: "Penche la tête et montre le sommet", label: "Montre le sommet de ton crâne" },
];

type Landmark = { x: number; y: number; z: number };

export default function HairScanner({ onAllCaptured, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);

  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const lastFaceTimeRef = useRef<number>(0);
  const stableFramesRef = useRef(0);
  const photosRef = useRef<string[]>([]);
  const capturingRef = useRef(false);
  const phaseRef = useRef(0);
  const landmarksRef = useRef<Landmark[] | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "aligning" | "captured" | "error">("loading");
  const [loadingMsg, setLoadingMsg] = useState("Préparation de la caméra...");
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [alignProgress, setAlignProgress] = useState(0);

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
        phaseRef.current += 1;
        setPhase(phaseRef.current);
        setStatus("ready");
        stableFramesRef.current = 0;
        setAlignProgress(0);
        landmarksRef.current = null;
        capturingRef.current = false;
      }, 600);
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
    if (!video || !overlay || !segmenter) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (capturingRef.current) {
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
          if (!mask) return;

          const data = mask.getAsUint8Array();
          const totalPixels = data.length;
          let hairPixels = 0;
          const img = ctx.createImageData(overlay.width, overlay.height);

          for (let i = 0; i < totalPixels; i++) {
            const p = i * 4;
            if (data[i] === HAIR_CLASS) {
              hairPixels++;
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

          // Draw face mesh on top of hair overlay
          const lm = landmarksRef.current;
          if (lm) {
            drawFaceMesh(ctx, lm, overlay.width, overlay.height);
          }

          // Auto-capture based on hair density
          const ratio = hairPixels / totalPixels;
          if (ratio >= MIN_HAIR_RATIO && !capturingRef.current) {
            stableFramesRef.current += 1;
            const progress = Math.min(stableFramesRef.current / STABLE_FRAMES, 1);
            setAlignProgress(progress);
            setStatus("aligning");
            if (stableFramesRef.current >= STABLE_FRAMES) {
              doCapture();
            }
          } else {
            stableFramesRef.current = 0;
            setAlignProgress(0);
            if (!capturingRef.current) setStatus("ready");
          }
        });
      } catch {
        // frame skip
      }

      // Face detection (throttled, separate from segmenter)
      const face = faceRef.current;
      if (face && now - lastFaceTimeRef.current > FACE_DETECT_INTERVAL) {
        lastFaceTimeRef.current = now;
        try {
          const faceRes = face.detectForVideo(video, now);
          if (faceRes.faceLandmarks?.length) {
            landmarksRef.current = faceRes.faceLandmarks[0];
          } else {
            landmarksRef.current = null;
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

        // Segmenter (GPU → CPU fallback)
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

        // Face Landmarker for mesh (GPU → CPU fallback, optional)
        try {
          faceRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });
        } catch {
          try {
            faceRef.current = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: FACE_MODEL },
              runningMode: "VIDEO",
              numFaces: 1,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            });
          } catch {
            // Face mesh optional
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

        {/* Progress ring */}
        {status === "aligning" && (
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

function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number
) {
  const connections = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  if (!connections) return;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (const conn of connections) {
    const from = landmarks[conn.start];
    const to = landmarks[conn.end];
    if (!from || !to) continue;
    ctx.moveTo(from.x * w, from.y * h);
    ctx.lineTo(to.x * w, to.y * h);
  }
  ctx.stroke();

  // Face oval contour slightly brighter
  const oval = FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
  if (!oval) return;
  ctx.strokeStyle = "rgba(22, 185, 129, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < oval.length; i++) {
    const pt = landmarks[oval[i].start];
    if (!pt) continue;
    if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
    else ctx.lineTo(pt.x * w, pt.y * h);
  }
  ctx.closePath();
  ctx.stroke();
}
