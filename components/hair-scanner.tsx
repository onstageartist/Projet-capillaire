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

type ScanPhase = "face" | "top";

type Props = {
  phase: ScanPhase;
  onCapture: (dataUrl: string, phase: ScanPhase) => void;
  onReady?: () => void;
  onError?: (err: Error) => void;
};

export default function HairScanner({ phase, onCapture, onReady, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);

  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const alignedFramesRef = useRef<number>(0);
  const capturedRef = useRef(false);

  const [status, setStatus] = useState<"init" | "ready" | "aligning" | "captured" | "error">("init");
  const [alignProgress, setAlignProgress] = useState(0);

  const ALIGN_THRESHOLD = 15;

  const loadModels = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAIR_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
    faceRef.current = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  }, []);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const video = videoRef.current!;
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    await video.play();
  }, []);

  const capture = useCallback(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    const video = videoRef.current!;
    const c = captureRef.current!;
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    setStatus("captured");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onCapture(dataUrl, phase);
  }, [onCapture, phase]);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const segmenter = segmenterRef.current;
    const face = faceRef.current;
    if (!video || !overlay || !segmenter || !face || capturedRef.current) return;

    if (video.currentTime !== lastTimeRef.current && video.videoWidth > 0) {
      lastTimeRef.current = video.currentTime;
      const now = performance.now();

      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      const ctx = overlay.getContext("2d")!;

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

      if (phase === "face") {
        const faceRes = face.detectForVideo(video, now);
        const ok = isWellAligned(faceRes, video.videoWidth, video.videoHeight);
        if (ok) {
          alignedFramesRef.current += 1;
          setAlignProgress(Math.min(alignedFramesRef.current / ALIGN_THRESHOLD, 1));
          setStatus("aligning");
          if (alignedFramesRef.current > ALIGN_THRESHOLD) {
            capture();
            return;
          }
        } else {
          alignedFramesRef.current = 0;
          setAlignProgress(0);
          setStatus("ready");
        }
      }
    }
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [phase, capture]);

  useEffect(() => {
    let mounted = true;
    capturedRef.current = false;
    alignedFramesRef.current = 0;
    setAlignProgress(0);
    setStatus("init");

    (async () => {
      try {
        await loadModels();
        await startCamera();
        if (!mounted) return;
        setStatus("ready");
        onReady?.();
        rafRef.current = requestAnimationFrame(renderLoop);
      } catch (e) {
        console.error(e);
        setStatus("error");
        onError?.(e instanceof Error ? e : new Error("Erreur caméra"));
      }
    })();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-[16px]">
      <video
        ref={videoRef}
        className="w-full"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas ref={captureRef} className="hidden" />

      {/* Grille de cadrage */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-[15%] rounded-full border-2 border-accent/30" />
        <div className="absolute left-1/2 top-[10%] bottom-[10%] w-px -translate-x-1/2 bg-accent/15" />
        <div className="absolute top-1/2 left-[10%] right-[10%] h-px -translate-y-1/2 bg-accent/15" />
      </div>

      {/* Anneau de progression (auto-capture face) */}
      {phase === "face" && status === "aligning" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg className="h-48 w-48" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none" stroke="var(--accent)" strokeWidth="3" strokeOpacity="0.2"
            />
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
        {status === "init" && (
          <span className="rounded-full bg-ink/60 px-4 py-1.5 text-sm font-medium text-text backdrop-blur-sm">
            Initialisation...
          </span>
        )}
        {status === "ready" && phase === "face" && (
          <span className="rounded-full bg-ink/60 px-4 py-1.5 text-sm font-medium text-text backdrop-blur-sm">
            Cadre ton visage de face
          </span>
        )}
        {status === "ready" && phase === "top" && (
          <span className="rounded-full bg-ink/60 px-4 py-1.5 text-sm font-medium text-text backdrop-blur-sm">
            Montre le sommet de ton crâne
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
      </div>

      {/* Bouton capture manuelle (sommet) */}
      {phase === "top" && status === "ready" && (
        <button
          onClick={capture}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-full border-4 border-accent bg-accent/20 transition-transform active:scale-95"
          aria-label="Capturer"
        >
          <div className="h-12 w-12 rounded-full bg-accent" />
        </button>
      )}
    </div>
  );
}

function isWellAligned(res: ReturnType<FaceLandmarker["detectForVideo"]>, _w: number, _h: number): boolean {
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
  const centered = Math.abs(cx - 0.5) < 0.12 && Math.abs(cy - 0.45) < 0.15;
  const bigEnough = boxW > 0.3;
  return centered && bigEnough;
}
