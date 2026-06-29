"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilesetResolver,
  ImageSegmenter,
  FaceLandmarker,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";
import { haptics } from "@/lib/haptics";
import { compressImage } from "@/lib/compress-image";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const HAIR_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const HAIR_CLASS = 1;
const EMERAUDE = [22, 185, 129];
// Nombre d'images consecutives "tout est bon" avant la prise auto (anti-tremblement).
const HOLD_FRAMES = 22;
const MIN_HAIR_RATIO = 0.06;
const FACE_DETECT_INTERVAL = 90;
const GRACE_PERIOD_MS = 1500;
// Au-dela, on considere que la detection galere et on pousse le bouton manuel.
const STRUGGLE_MS = 9000;

type Props = {
  onAllCaptured: (photos: string[], masks: string[]) => void;
};

// Construit le masque d'inpainting depuis le masque cheveux MediaPipe.
// Blanc = zone a repeindre (cheveux + zones a regarnir), noir = a preserver.
function buildInpaintMask(hairMask: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < hairMask.length; i++) {
    const v = hairMask[i] === 1 ? 255 : 0;
    const p = i * 4;
    img.data[p] = v; img.data[p + 1] = v; img.data[p + 2] = v; img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // dilatation pour englober recul frontal et couronne a regarnir
  const grow = Math.max(6, Math.round(height * 0.05));
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = `blur(${grow}px)`;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
  // re seuillage pour des bords nets
  const out = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < out.data.length; i += 4) {
    const on = out.data[i] > 40 ? 255 : 0;
    out.data[i] = on; out.data[i + 1] = on; out.data[i + 2] = on; out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  // Feathering LEGER (2px) : un bord juste assez doux pour fondre les cheveux,
  // sans creer une large zone grise que FLUX interpreterait comme "a repeindre"
  // (ce qui ferait deborder l'inpainting sur le front/visage). Best practice FLUX.
  ctx.filter = "blur(2px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
  return canvas.toDataURL("image/png");
}

const PHASES = [
  { title: "Scan 1 sur 3 · Visage", heading: "Regarde la caméra, visage bien droit", label: "Scan du front en cours", auto: true },
  { title: "Scan 2 sur 3 · Dessus de la tête", heading: "Penche la tête vers l'avant", label: "Scan du dessus en cours", auto: true },
  { title: "Photo 3 sur 3 · Tête entière", heading: "Recule pour montrer ta tête entière", label: "Appuie pour prendre la photo", auto: false },
];

type Landmark = { x: number; y: number; z: number };

// Guidage en direct a partir des reperes du visage : trop loin, trop pres,
// decentre, tete penchee. Une seule consigne a la fois, en action positive.
// faceFrac = largeur du visage en fraction du cadre (mesure de distance robuste,
// independante de la resolution). Pose lue sur la matrice 4x4 (column-major).
function analyzeFace(
  lm: Landmark[],
  matrix?: Float32Array | number[] | null
): { msg: string; ready: boolean } {
  const left = lm[234], right = lm[454], nose = lm[1];
  if (!left || !right || !nose) return { msg: "Place ton visage dans le cadre", ready: false };

  const faceFrac = Math.abs(right.x - left.x);
  const cx = nose.x, cy = nose.y;

  let tilted = false;
  if (matrix && matrix.length >= 11) {
    const deg = (r: number) => (r * 180) / Math.PI;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const pitch = deg(Math.asin(clamp(-matrix[6])));
    const yaw = deg(Math.atan2(matrix[2], matrix[10]));
    const roll = deg(Math.atan2(matrix[4], matrix[5]));
    tilted = Math.abs(yaw) > 18 || Math.abs(pitch) > 18 || Math.abs(roll) > 15;
  }

  if (faceFrac < 0.24) return { msg: "Rapproche-toi un peu", ready: false };
  if (faceFrac > 0.74) return { msg: "Recule un peu", ready: false };
  if (Math.abs(cx - 0.5) > 0.2 || Math.abs(cy - 0.46) > 0.22)
    return { msg: "Centre ton visage dans le cadre", ready: false };
  if (tilted) return { msg: "Tiens ta tête bien droite, regarde la caméra", ready: false };
  return { msg: "Parfait, ne bouge plus", ready: true };
}

// Controle qualite de la prise : nettete (variance du Laplacien) + luminosite,
// sur une version reduite (rapide). Un bon avant conditionne un bon apres.
function assessQuality(src: HTMLCanvasElement): { ok: boolean; reason: string } {
  const w = 320;
  const h = Math.max(1, Math.round((w * src.height) / src.width));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { ok: true, reason: "" };
  ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  let bSum = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    g[p] = v; bSum += v;
  }
  const brightness = bSum / g.length;
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const L = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      sum += L; sum2 += L * L; n++;
    }
  const blurVar = sum2 / n - (sum / n) * (sum / n);
  if (brightness < 45) return { ok: false, reason: "Trop sombre, rapproche-toi d'une lumiere" };
  if (brightness > 215) return { ok: false, reason: "Trop de lumiere, eloigne-toi de la source" };
  if (blurVar < 70) return { ok: false, reason: "Image floue, tiens le telephone bien stable" };
  return { ok: true, reason: "" };
}

// Luminosite moyenne d'une frame, sur un downscale 64px (tres rapide) : sert au
// retour lumiere EN DIRECT, pour prevenir avant la prise plutot qu'apres.
function frameBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement): number {
  const w = 64;
  const h = Math.max(1, Math.round((w * video.videoHeight) / video.videoWidth));
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 128;
  ctx.drawImage(video, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return sum / (d.length / 4);
}

// Message clair selon la vraie cause de l'echec camera (err.name, jamais le message).
// Chaque cause appelle une action differente : on ne laisse jamais un ecran muet.
function cameraErrorMessage(err: unknown): { title: string; hint: string } {
  const name = (err as { name?: string })?.name || "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        title: "Accès à la caméra refusé",
        hint: "Autorise la caméra dans le cadenas du navigateur (ou dans Réglages sur iPhone), puis réessaie. Tu peux aussi importer une photo.",
      };
    case "NotFoundError":
      return {
        title: "Aucune caméra détectée",
        hint: "On ne trouve pas de caméra sur cet appareil. Importe une photo pour continuer.",
      };
    case "NotReadableError":
      return {
        title: "Caméra déjà utilisée",
        hint: "Une autre application utilise la caméra. Ferme-la puis réessaie, ou importe une photo.",
      };
    default:
      return {
        title: "Caméra indisponible",
        hint: "Impossible d'ouvrir la caméra. Réessaie, ou importe une photo depuis ta galerie.",
      };
  }
}

export default function HairScanner({ onAllCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);

  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);
  const lastFaceTimeRef = useRef<number>(0);
  const holdRef = useRef(0);
  const photosRef = useRef<string[]>([]);
  const masksRef = useRef<string[]>([]);
  const maskBufRef = useRef<Uint8Array | null>(null);
  const maskDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const capturingRef = useRef(false);
  const phaseRef = useRef(0);
  const landmarksRef = useRef<Landmark[] | null>(null);
  const matrixRef = useRef<Float32Array | number[] | null>(null);
  const phaseStartTimeRef = useRef<number>(0);
  const coachRef = useRef("");
  const qualityUntilRef = useRef(0);
  // Echantillonnage lumiere en direct (throttle) : on previent AVANT la prise
  // si c'est trop sombre / trop clair, au lieu d'attendre une prise refusee.
  const lightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightTimeRef = useRef(0);
  const lightMsgRef = useRef("");
  // Throttle de la segmentation : on plafonne a ~25 traitements/s. Le rendu reste
  // fluide a l'oeil mais on divise le cout CPU (cle quand la camera est en haute
  // resolution : sinon on boucle sur 1,5M de pixels 30x/s).
  const lastSegRef = useRef(0);
  // ImageData reutilisee entre les frames (au lieu d'en allouer une par frame).
  const overlayImgRef = useRef<ImageData | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "aligning" | "captured" | "error">("loading");
  const [loadingMsg, setLoadingMsg] = useState("Préparation de la caméra...");
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [alignProgress, setAlignProgress] = useState(0);
  const [coachMsg, setCoachMsg] = useState("");
  const [struggling, setStruggling] = useState(false);
  const [camError, setCamError] = useState<{ title: string; hint: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);

  // Repli universel : une photo importee de la galerie alimente le MEME pipeline.
  // Elle sert d'avant et de base d'analyse ; pas de masque (l'apres bascule alors
  // sur l'edition pleine cote serveur). Personne ne reste bloque.
  const handleImport = useCallback(
    async (file: File) => {
      // Compresse la photo importee (une galerie peut faire 10+ Mo) avant de
      // l'envoyer dans le pipeline -> upload + IA plus rapides, pas de surcout.
      const compressed = await compressImage(file).catch(() => file);
      const fr = new FileReader();
      fr.onload = () => {
        const url = String(fr.result || "");
        if (!url.startsWith("data:image")) return;
        haptics.confirm();
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        onAllCaptured([url, url, url], ["", "", ""]);
      };
      fr.readAsDataURL(compressed);
    },
    [onAllCaptured]
  );

  // Affiche une consigne, debouncee : on ne re-rend que si le message change.
  const setCoach = useCallback((m: string) => {
    if (coachRef.current !== m) {
      coachRef.current = m;
      setCoachMsg(m);
    }
  }, []);

  const doCapture = useCallback(() => {
    if (capturingRef.current) return;
    capturingRef.current = true;

    const video = videoRef.current!;
    const c = captureRef.current!;
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const cCtx = c.getContext("2d")!;
    cCtx.drawImage(video, 0, 0, c.width, c.height);

    const reject = (reason: string) => {
      capturingRef.current = false;
      holdRef.current = 0;
      setAlignProgress(0);
      qualityUntilRef.current = performance.now() + 2400;
      setCoach(reason);
      setStatus("ready");
    };

    // 1) Qualite (nettete + lumiere) : un bon AVANT conditionne un bon apres.
    const q = assessQuality(c);
    if (!q.ok) { reject(q.reason); return; }

    // 2) Contenu minimal selon la phase : on REFUSE un mur / ecran noir / cadrage
    // vide. Sans visage (face) ou sans cheveux (dessus), la prise est inutile et
    // l'avant/apres serait nul -> on ne capture pas une poubelle.
    const hb = maskBufRef.current;
    let hairCount = 0;
    if (hb) for (let i = 0; i < hb.length; i++) if (hb[i]) hairCount++;
    const hairRatioNow = hb && hb.length ? hairCount / hb.length : 0;
    const faceSeen = !!landmarksRef.current;
    const phaseNow = phaseRef.current;
    if (phaseNow === 0 && !faceSeen) {
      reject("Visage non détecté · place bien ton visage dans le cadre"); return;
    }
    if (phaseNow === 1 && hairRatioNow < MIN_HAIR_RATIO) {
      reject("On ne voit pas le dessus de ta tête · penche-toi vers la caméra"); return;
    }
    if (phaseNow === 2 && !faceSeen && hairRatioNow < 0.02) {
      reject("Cadre bien ta tête dans le repère"); return;
    }

    const dataUrl = c.toDataURL("image/jpeg", 0.95); // source nette = avant/apres net

    setFlash(true);
    haptics.confirm();
    setTimeout(() => setFlash(false), 300);

    photosRef.current = [...photosRef.current, dataUrl];

    // masque d'inpainting de cette prise (depuis le dernier masque cheveux MediaPipe)
    let maskUrl = "";
    try {
      const hb = maskBufRef.current;
      const { w, h } = maskDimsRef.current;
      if (hb && w && h && hb.length === w * h) maskUrl = buildInpaintMask(hb, w, h);
    } catch { /* masque optionnel */ }
    masksRef.current = [...masksRef.current, maskUrl];

    if (photosRef.current.length < PHASES.length) {
      setTimeout(() => {
        phaseRef.current += 1;
        setPhase(phaseRef.current);
        setStatus("ready");
        holdRef.current = 0;
        setAlignProgress(0);
        setStruggling(false);
        landmarksRef.current = null;
        matrixRef.current = null;
        phaseStartTimeRef.current = performance.now();
        capturingRef.current = false;
      }, 600);
    } else {
      setStatus("captured");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      onAllCaptured(photosRef.current, masksRef.current);
    }
  }, [onAllCaptured, setCoach]);

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

      // Segmentation throttlee a ~25/s : on ne re-traite (et on ne reinitialise
      // le canvas) que toutes les ~40ms. Entre deux, l'overlay precedent persiste
      // -> aucun clignotement, CPU divise (decisif en haute resolution).
      if (now - lastSegRef.current >= 40) {
      lastSegRef.current = now;
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
          // Reutilise l'ImageData (chaque pixel est reecrit a chaque frame) au
          // lieu d'en allouer une neuve a chaque passe -> moins de GC.
          if (!overlayImgRef.current || overlayImgRef.current.width !== overlay.width || overlayImgRef.current.height !== overlay.height) {
            overlayImgRef.current = ctx.createImageData(overlay.width, overlay.height);
          }
          const img = overlayImgRef.current;

          // buffer du masque cheveux (1 = cheveux), reutilise entre les frames
          if (!maskBufRef.current || maskBufRef.current.length !== totalPixels) {
            maskBufRef.current = new Uint8Array(totalPixels);
          }
          const hairBuf = maskBufRef.current;
          maskDimsRef.current = { w: overlay.width, h: overlay.height };

          for (let i = 0; i < totalPixels; i++) {
            const p = i * 4;
            if (data[i] === HAIR_CLASS) {
              hairPixels++;
              hairBuf[i] = 1;
              img.data[p] = EMERAUDE[0];
              img.data[p + 1] = EMERAUDE[1];
              img.data[p + 2] = EMERAUDE[2];
              img.data[p + 3] = 110;
            } else {
              hairBuf[i] = 0;
              img.data[p + 3] = 0;
            }
          }

          ctx.putImageData(img, 0, 0);

          mask.close();

          // Draw face mesh
          const lm = landmarksRef.current;
          if (lm) {
            drawFaceMesh(ctx, lm, overlay.width, overlay.height);
          }

          if (capturingRef.current) return;

          // ---- Guidage en direct, une consigne a la fois, par phase ----
          const phaseIdx = phaseRef.current;
          const ph = PHASES[phaseIdx];
          const elapsed = now - phaseStartTimeRef.current;
          const ratio = hairPixels / totalPixels;

          let msg = "";
          let ready = false;

          if (ph?.auto && phaseIdx === 0) {
            // Phase visage : on guide sur la distance, le centrage et la pose.
            const lm = landmarksRef.current;
            if (!lm) {
              msg = "Place ton visage dans le cadre";
            } else {
              const a = analyzeFace(lm, matrixRef.current);
              if (a.ready && ratio < 0.03) {
                msg = "Montre le haut de ton front";
              } else {
                msg = a.msg;
                ready = a.ready;
              }
            }
          } else if (ph?.auto) {
            // Phase dessus : on veut le crane penche vers la camera. Signal fiable :
            // le visage n'est PLUS detecte de face (tete inclinee) ET assez de
            // cheveux dans le cadre. Sinon on guide vers le bon geste.
            const faceVisible = !!landmarksRef.current;
            if (ratio < MIN_HAIR_RATIO) {
              msg = "Penche ta tête vers la caméra";
            } else if (faceVisible) {
              msg = "Penche un peu plus la tête";
            } else {
              msg = "Parfait, ne bouge plus";
              ready = true;
            }
          } else {
            // Phase portrait : manuelle, on cadre puis on appuie.
            msg = "Recule pour cadrer toute ta tête, puis appuie";
          }

          // Lumiere en direct prioritaire : sans bonne lumiere, rien d'autre ne
          // compte (et la prise serait refusee). On le dit tout de suite.
          if (lightMsgRef.current) {
            msg = lightMsgRef.current;
            ready = false;
          }

          // Un message qualite (prise refusee) reste prioritaire le temps de son affichage.
          if (now < qualityUntilRef.current) {
            // on garde le message qualite courant, on ne le remplace pas
          } else {
            setCoach(msg);
          }

          if (ready && elapsed > GRACE_PERIOD_MS) {
            holdRef.current = Math.min(holdRef.current + 1, HOLD_FRAMES);
            setAlignProgress(holdRef.current / HOLD_FRAMES);
            setStatus("aligning");
            setStruggling(false);
            if (holdRef.current >= HOLD_FRAMES) doCapture();
          } else {
            holdRef.current = Math.max(0, holdRef.current - 2);
            setAlignProgress(holdRef.current / HOLD_FRAMES);
            if (!capturingRef.current) setStatus("ready");
            // Detection qui galere : on met le declencheur manuel en avant.
            setStruggling(ph?.auto === true && elapsed > STRUGGLE_MS);
          }
        });
      } catch {
        // frame skip
      }
      } // fin throttle segmentation

      // Echantillon lumiere en direct (throttle ~600ms, cout negligeable)
      if (now - lightTimeRef.current > 600) {
        lightTimeRef.current = now;
        if (!lightCanvasRef.current) lightCanvasRef.current = document.createElement("canvas");
        try {
          const b = frameBrightness(video, lightCanvasRef.current);
          lightMsgRef.current =
            b < 45 ? "Trop sombre · mets-toi face à une lumière"
            : b > 215 ? "Trop de lumière · éloigne-toi de la source"
            : "";
        } catch { lightMsgRef.current = ""; }
      }

      // Face detection (throttled)
      const face = faceRef.current;
      if (face && now - lastFaceTimeRef.current > FACE_DETECT_INTERVAL) {
        lastFaceTimeRef.current = now;
        try {
          const faceRes = face.detectForVideo(video, now);
          if (faceRes.faceLandmarks?.length) {
            landmarksRef.current = faceRes.faceLandmarks[0];
            matrixRef.current = faceRes.facialTransformationMatrixes?.[0]?.data ?? null;
          } else {
            landmarksRef.current = null;
            matrixRef.current = null;
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
        setCamError({
          title: "Chargement trop long",
          hint: "Le scanner met du temps à démarrer (connexion lente). Réessaie, ou importe une photo.",
        });
        setStatus("error");
      }
    }, 45000);

    (async () => {
      try {
        setStatus("loading");
        setCamError(null);
        setLoadingMsg("Accès à la caméra...");
        // Contraintes en "ideal" (jamais "exact" qui rejette sur beaucoup d'appareils),
        // avec repli total si la combinaison demandee n'est pas supportee.
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            // Resolution portrait 3:4 plus haute (photo source plus nette = avant/apres
            // plus net). "ideal" s'auto-equilibre : un bon telephone monte en detail,
            // un appareil modeste reste leger (pas de perte de fluidite).
            video: { facingMode: { ideal: "user" }, width: { ideal: 1080 }, height: { ideal: 1440 } },
            audio: false,
          });
        } catch (e) {
          if ((e as { name?: string })?.name === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw e;
          }
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play();

        if (!mounted) return;
        setLoadingMsg("Chargement de l'analyse · le 1er chargement peut prendre quelques secondes");

        const vision = await FilesetResolver.forVisionTasks(WASM);

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

        try {
          faceRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
          });
        } catch {
          try {
            faceRef.current = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: FACE_MODEL },
              runningMode: "VIDEO",
              numFaces: 1,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: true,
            });
          } catch {
            // Face mesh optional
          }
        }

        if (!mounted) return;
        clearTimeout(timeout);
        setStatus("ready");
        phaseStartTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(renderLoop);
      } catch (e) {
        console.error("HairScanner error:", e);
        if (!mounted) return;
        clearTimeout(timeout);
        // On reste monte et on propose retry + import : l'utilisateur n'est jamais bloque.
        setCamError(cameraErrorMessage(e));
        setStatus("error");
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      // Libere le contexte WebGL et la memoire WASM (sinon fuite, cf. doc MediaPipe).
      try { segmenterRef.current?.close(); } catch { /* ignore */ }
      try { faceRef.current?.close(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const currentPhase = PHASES[phase];

  // Ecran d'erreur : on explique la cause et on propose toujours une issue.
  if (status === "error" && camError) {
    return (
      <div className="w-full space-y-4">
        <div className="rounded-[16px] border border-border bg-surface p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <svg className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v15.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="font-display text-lg font-semibold text-text">{camError.title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-muted">{camError.hint}</p>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="w-full rounded-[var(--radius-md)] bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Réessayer la caméra
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="w-full rounded-[var(--radius-md)] border border-border px-5 py-3 text-sm font-medium text-text transition-colors hover:bg-surface-2"
            >
              Importer une photo
            </button>
          </div>
        </div>

        <input
          ref={importRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <p className="text-sm font-medium text-accent">{currentPhase?.title}</p>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-text">
          {currentPhase?.heading}
        </h2>
      </div>

      <div className="relative mx-auto aspect-[3/4] max-h-[58vh] w-full overflow-hidden rounded-[16px] bg-surface-2">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
        <canvas ref={captureRef} className="hidden" />

        {/* Réticule de cadrage : coins de viseur (instrument de précision) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="var(--accent)" strokeWidth="0.6" strokeLinecap="round" opacity="0.7">
            <path d="M6 14 V6 H14" />
            <path d="M86 6 H94 V14" />
            <path d="M94 86 V94 H86" />
            <path d="M14 94 H6 V86" />
          </g>
        </svg>

        {/* Ovale de cadrage du visage (phase 1) : repere ou se placer, vert quand c'est bon */}
        {phase === 0 && (status === "ready" || status === "aligning") && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <ellipse
              cx="50" cy="44" rx="26" ry="34"
              fill="none"
              stroke={status === "aligning" ? "var(--accent)" : "rgba(255,255,255,0.6)"}
              strokeWidth="0.7"
              strokeDasharray={status === "aligning" ? "none" : "3 2.5"}
              className="transition-colors duration-300"
            />
          </svg>
        )}

        {/* Repere de cadrage phase 3 (portrait) : place ta tete entiere dans le
            gabarit. Ce portrait nourrit l'avant/apres -> bon cadrage = bon rendu. */}
        {phase === 2 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <ellipse
              cx="50" cy="40" rx="22" ry="29"
              fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" strokeDasharray="3 2.5"
            />
            <path d="M28 86 Q50 64 72 86" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" strokeDasharray="3 2.5" />
          </svg>
        )}

        {/* Repere visuel phase 2 (dessus) : on indique de pencher la tete vers
            l'avant pour exposer la couronne, tant que ce n'est pas bon. */}
        {phase === 1 && status !== "aligning" && (
          <div className="pointer-events-none absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center gap-1">
            <svg className="h-9 w-9 animate-bounce text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v13m0 0l-5-5m5 5l5-5" />
            </svg>
            <span className="rounded-full bg-ink/70 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              Penche le dessus de ta tête vers la caméra
            </span>
          </div>
        )}

        {flash && <div className="absolute inset-0 bg-white/30 transition-opacity duration-300" />}

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

        {/* Bandeau de consigne : toujours une indication claire a l'ecran. aria-live
            pour que les lecteurs d'ecran annoncent le guidage en temps reel. */}
        <div role="status" aria-live="polite" className="pointer-events-none absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-4 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span className="max-w-[90%] rounded-full bg-ink/70 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                {loadingMsg}
              </span>
            </div>
          )}
          {(status === "ready" || status === "aligning") && coachMsg && (
            <span
              className={`max-w-[92%] rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-sm ${
                status === "aligning"
                  ? "bg-accent/25 text-white"
                  : "bg-ink/70 text-white"
              }`}
            >
              {coachMsg}
            </span>
          )}
          {struggling && status === "ready" && (
            <span className="max-w-[92%] rounded-full bg-amber-500/85 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              Mets-toi face à une lumière — ou appuie pour prendre la photo
            </span>
          )}
          {status === "captured" && (
            <span className="rounded-full bg-accent/25 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
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
          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
            <button
              onClick={doCapture}
              className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-accent bg-accent/20 transition-transform active:scale-95 ${
                struggling ? "animate-pulse ring-4 ring-accent/40" : ""
              }`}
              aria-label="Prendre la photo"
            >
              <div className="h-12 w-12 rounded-full bg-accent" />
            </button>
            <span className="rounded-full bg-ink/55 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              {currentPhase?.auto ? "Auto, ou appuie" : "Appuie pour la photo"}
            </span>
          </div>
        )}
      </div>

      {/* Repli toujours accessible : la camera coince ? on importe une photo. */}
      <div className="text-center">
        <button
          onClick={() => importRef.current?.click()}
          className="text-xs text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
        >
          La caméra ne marche pas ? Importer une photo
        </button>
      </div>
      <input
        ref={importRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
      />
    </div>
  );
}

const MESH_POINTS = [
  10, 67, 297, 109, 338, 151,
  70, 63, 105, 300, 293, 334, 168,
  33, 133, 159, 145, 362, 263, 386, 374,
  6, 4, 1, 98, 327,
  116, 345, 123, 352,
  61, 291, 0, 17,
  127, 356, 132, 361, 58, 288, 152, 172, 397,
];

const MESH_LINES: [number, number][] = [
  [10, 67], [10, 297], [10, 151], [67, 109], [297, 338],
  [109, 105], [338, 334], [67, 151], [297, 151], [151, 168],
  [67, 70], [297, 300],
  [105, 63], [63, 70], [334, 293], [293, 300],
  [70, 168], [300, 168],
  [168, 6], [6, 4], [4, 1],
  [33, 168], [362, 168], [133, 105], [263, 334],
  [1, 98], [1, 327], [98, 33], [327, 362],
  [133, 116], [263, 345], [116, 123], [345, 352],
  [123, 61], [352, 291], [105, 116], [334, 345],
  [61, 0], [291, 0], [61, 17], [291, 17],
  [98, 61], [327, 291],
  [109, 127], [338, 356], [127, 132], [356, 361],
  [132, 58], [361, 288], [58, 172], [288, 397],
  [172, 152], [397, 152], [17, 152],
  [123, 132], [352, 361], [61, 58], [291, 288],
  [33, 159], [159, 133], [133, 145], [145, 33],
  [362, 386], [386, 263], [263, 374], [374, 362],
];

function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number
) {
  // Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [a, b] of MESH_LINES) {
    const from = landmarks[a];
    const to = landmarks[b];
    if (!from || !to) continue;
    ctx.moveTo(from.x * w, from.y * h);
    ctx.lineTo(to.x * w, to.y * h);
  }
  ctx.stroke();

  // Dots
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  for (const idx of MESH_POINTS) {
    const pt = landmarks[idx];
    if (!pt) continue;
    ctx.beginPath();
    ctx.arc(pt.x * w, pt.y * h, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

