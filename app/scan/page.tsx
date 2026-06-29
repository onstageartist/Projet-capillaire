"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { compressImage } from "@/lib/compress-image";
import { Button, Card, Disclaimer, Checkbox } from "@/components/ui";
import dynamic from "next/dynamic";

const HairScanner = dynamic(() => import("@/components/hair-scanner"), { ssr: false });

type ScanStep = "manque" | "choix" | "capture" | "processing" | "bilan";

const ANALYSIS_STEPS = [
  "Détection de la zone capillaire",
  "Stabilisation pose et lumière",
  "Segmentation des zones, front, milieu, couronne",
  "Estimation de la densité par zone",
  "Repérage de la ligne frontale",
  "Analyse de la couronne",
  "Estimation du stade, échelle Norwood",
  "Calcul de l'indice de couverture",
  "Génération de ton bilan",
];

interface ScanResult {
  usable: boolean;
  score: number | null;
  norwood: string | null;
  zones: string[];
  recommendations: string[];
  message: string;
  scanId?: string;
  photoPath?: string;
}

export default function Scan() {
  const [step, setStep] = useState<ScanStep>("manque");
  const [photos, setPhotos] = useState<string[]>([]);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisPercent, setAnalysisPercent] = useState(0);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const router = useRouter();
  const analysisDone = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/auth?next=/scan");
    });
  }, [router]);

  const handleAllCaptured = useCallback((capturedPhotos: string[], capturedMasks: string[]) => {
    setPhotos(capturedPhotos);
    // La prise portrait (3e) est l'avant ; son masque sert a l'inpainting.
    if (capturedPhotos[2]) {
      sessionStorage.setItem("portraitPhoto", capturedPhotos[2]);
      sessionStorage.setItem("portraitMask", capturedMasks?.[2] || "");
    }
    trackEvent("scan_captured", { photos: capturedPhotos.length });
    setStep("processing");
  }, []);

  // Processing animation + API call
  useEffect(() => {
    if (step !== "processing" || analysisDone.current) return;
    analysisDone.current = true;

    trackEvent("scan_started");

    const stepInterval = setInterval(() => {
      setAnalysisStep((s) => {
        if (s < ANALYSIS_STEPS.length - 1) return s + 1;
        clearInterval(stepInterval);
        return s;
      });
    }, 1800);

    const percentInterval = setInterval(() => {
      setAnalysisPercent((p) => {
        if (p >= 95) { clearInterval(percentInterval); return p; }
        return p + 1;
      });
    }, 150);

    async function runAnalysis() {
      try {
        const photoToSend = photos[0];
        if (!photoToSend) return;
        const blob = await fetch(photoToSend).then(r => r.blob());
        const raw = new File([blob], "scan.jpg", { type: "image/jpeg" });
        // Compresse avant l'envoi : moins de data, upload plus rapide, coût IA réduit.
        const file = await compressImage(raw);

        const supabase = createClient();
        await supabase.from("profiles").upsert(
          { id: (await supabase.auth.getUser()).data.user!.id, photo_consent_at: new Date().toISOString() },
          { onConflict: "id" }
        );

        const formData = new FormData();
        formData.append("photo", file);
        const res = await fetch("/api/scan", { method: "POST", body: formData });
        if (!res.ok && res.status !== 200) {
          clearInterval(stepInterval);
          clearInterval(percentInterval);
          // 429 = trop de scans ; sinon erreur générique, jamais d'écran figé.
          setError(res.status === 429
            ? "Trop de scans en peu de temps. Réessaie dans une minute."
            : "Le serveur n'a pas pu analyser la photo. Réessaie.");
          setStep("manque");
          analysisDone.current = false;
          return;
        }
        const data = await res.json();

        if (data.error || data.usable === false) {
          clearInterval(stepInterval);
          clearInterval(percentInterval);
          setError(data.message || data.error || "Photo non exploitable. Réessaie avec plus de lumière.");
          setStep("manque");
          analysisDone.current = false;
          return;
        }

        setResult(data);
        setAnalysisPercent(100);
        setAnalysisStep(ANALYSIS_STEPS.length - 1);

        await new Promise(r => setTimeout(r, 1500));

        trackEvent("scan_completed", { score: data.score });
        sessionStorage.setItem("scanResult", JSON.stringify(data));
        if (data.photoPath) sessionStorage.setItem("scanPhotoPath", data.photoPath);

        // Inpainting au masque : on envoie la prise portrait (l'avant) + son masque.
        // Garde anti faux-apres : stade tres avance, on ne genere pas de projection.
        const portrait = sessionStorage.getItem("portraitPhoto");
        const portraitMask = sessionStorage.getItem("portraitMask") || undefined;
        const veryAdvanced = ["VI", "VII"].includes(String(data.norwood || "").toUpperCase());
        if (data.scanId && portrait && !veryAdvanced) {
          fetch("/api/projection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scanId: data.scanId,
              photoPath: data.photoPath,
              beforeImage: portrait,
              maskImage: portraitMask,
            }),
          }).catch(() => {});
        }

        setStep("bilan");
      } catch {
        clearInterval(stepInterval);
        clearInterval(percentInterval);
        setError("Une erreur est survenue. Réessaie.");
        setStep("manque");
        analysisDone.current = false;
      }
    }

    runAnalysis();
    return () => { clearInterval(stepInterval); clearInterval(percentInterval); };
  }, [step, photos]);

  // ─── ÉCRAN 1 : Le manque ───
  if (step === "manque") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
          <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text">
            Tu n'as jamais mesuré où en sont tes cheveux
          </h1>
          <p className="text-base text-text-muted">
            Le miroir écrase le relief, une photo ment selon la lumière. Pour décider, il te faut une mesure stable de ta densité, pas une impression. On le fait en une photo.
          </p>

          {/* Visuel zones */}
          <div className="flex justify-center">
            <svg viewBox="0 0 200 160" className="h-40 w-40 text-accent">
              <ellipse cx="100" cy="78" rx="65" ry="72" fill="none" stroke="var(--line)" strokeWidth="2" />
              <ellipse cx="33" cy="82" rx="6" ry="14" fill="none" stroke="var(--line)" strokeWidth="1.5" />
              <ellipse cx="167" cy="82" rx="6" ry="14" fill="none" stroke="var(--line)" strokeWidth="1.5" />
              <path d="M 50 55 Q 65 25 100 22 Q 135 25 150 55" fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 3" />
              <ellipse cx="100" cy="52" rx="50" ry="16" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4" />
              <text x="100" y="56" textAnchor="middle" fill="var(--accent)" fontSize="8" fontWeight="600">front</text>
              <ellipse cx="100" cy="90" rx="30" ry="24" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4" />
              <text x="100" y="94" textAnchor="middle" fill="var(--accent)" fontSize="8" fontWeight="600">couronne</text>
            </svg>
          </div>

          {error && (
            <div className="rounded-[12px] border border-danger/20 bg-danger/5 p-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setError("");
              setStep("choix");
            }}
          >
            Mesurer ma densité
          </Button>

          <Disclaimer className="justify-center" />
        </div>
      </main>
    );
  }

  // ─── ÉCRAN 2 : Le choix cadré ───
  if (step === "choix") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
          <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text">
            On passe à ton scan
          </h1>
          <p className="text-base text-text-muted">
            Ça prend une dizaine de secondes. Tes photos restent privées, et tu peux les supprimer quand tu veux.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Carte rouge : photo simple */}
            <Card className="border-danger/30 opacity-60">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-semibold text-text">Photo simple</span>
              </div>
              <p className="text-xs text-text-faint">Approximatif, dépend de la lumière.</p>
            </Card>

            {/* Carte verte : scan IA */}
            <Card className="border-accent/40">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-sm font-semibold text-text">Scan IA</span>
              </div>
              <p className="text-xs text-text-faint">Mesure tes zones et estime ta densité.</p>
            </Card>
          </div>

          {/* Mode d'emploi visuel : on montre les 3 prises AVANT d'ouvrir la
              camera, pour que personne ne soit perdu (moins de bugs, plus rapide). */}
          <div className="rounded-[12px] border border-border bg-surface p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
              3 prises, ~10 secondes — le guidage te dit tout à l'écran
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  n: "1", label: "Face", hint: "Visage droit, regarde la caméra",
                  icon: (
                    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="24" cy="22" r="11" />
                      <path d="M14 19q10 -7 20 0" />
                      <path d="M24 40v-5" />
                    </g>
                  ),
                },
                {
                  n: "2", label: "Dessus", hint: "Penche la tête vers l'avant",
                  icon: (
                    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 30q11 -16 22 0" />
                      <path d="M13 30q11 9 22 0" />
                      <path d="M24 8v8m0 0l-4-4m4 4l4-4" />
                    </g>
                  ),
                },
                {
                  n: "3", label: "Recul", hint: "Recule, montre toute ta tête",
                  icon: (
                    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="24" cy="20" r="8" />
                      <path d="M12 40q12 -14 24 0" />
                      <path d="M6 24h4M38 24h4" />
                    </g>
                  ),
                },
              ].map((s) => (
                <div key={s.n} className="flex flex-col items-center gap-1.5 rounded-[10px] bg-surface-2 p-2.5 text-center">
                  <svg viewBox="0 0 48 48" className="h-10 w-10 text-accent" aria-hidden="true">{s.icon}</svg>
                  <span className="text-xs font-semibold text-text">{s.n}. {s.label}</span>
                  <span className="text-[11px] leading-tight text-text-faint">{s.hint}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Consentement explicite avant la camera (donnees de sante, RGPD) */}
          <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <Checkbox
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              label="Je consens à ce que Scalpy prenne et analyse mes photos pour mon bilan capillaire, y compris les informations de bien-être qui en découlent, et à leur traitement par ses services d'analyse partenaires en Europe et aux États-Unis. Mes photos restent privées, ne servent jamais à entraîner ces services, et je peux les supprimer quand je veux."
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!consent}
            onClick={() => {
              trackEvent("camera_authorized");
              setStep("capture");
            }}
          >
            Lancer le scan
          </Button>

          <button
            onClick={() => setStep("manque")}
            className="block w-full text-center text-sm text-text-muted transition-colors hover:text-text"
          >
            Retour
          </button>
        </div>
      </main>
    );
  }

  // ─── ÉCRAN 5 : Capture (face + sommet dans un seul composant) ───
  if (step === "capture") {
    return (
      <main className="flex flex-1 flex-col items-center px-5 py-6">
        <div className="w-full max-w-lg space-y-4 animate-fade-in">
          <HairScanner onAllCaptured={handleAllCaptured} />

          <button
            onClick={() => setStep("choix")}
            className="block w-full text-center text-sm text-text-muted transition-colors hover:text-text"
          >
            Annuler
          </button>
        </div>
      </main>
    );
  }

  // ─── ÉCRAN 6 : Traitement théâtralisé ───
  if (step === "processing") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in text-center">
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
            Analyse de ton cuir chevelu
          </h1>

          {/* Anneau circulaire */}
          <div className="relative mx-auto h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="44"
                fill="none" stroke="var(--accent)" strokeWidth="4"
                strokeDasharray={`${analysisPercent * 2.76} 276`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-data text-[28px] font-medium text-text">
              {analysisPercent}%
            </span>
          </div>

          {/* Checklist */}
          <div className="space-y-2 text-left">
            {ANALYSIS_STEPS.map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-all duration-500 ${
                  i < analysisStep
                    ? "text-accent"
                    : i === analysisStep
                    ? "text-text"
                    : "text-text-faint"
                }`}
              >
                {i < analysisStep ? (
                  <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : i === analysisStep ? (
                  <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-accent" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line" />
                )}
                {label}
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─── ÉCRAN 7 : Le bilan livré ───
  if (step === "bilan" && result) {
    const zonesCount = result.zones?.length || 0;
    return (
      <main className="flex flex-1 flex-col items-center px-5 py-10">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
          <div className="text-center">
            <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
              Ton bilan est prêt
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              On a cartographié tes zones et estimé ta densité.
            </p>
          </div>

          <div className="flex justify-center">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-sm font-medium text-accent">
              Cartographie capillaire, {zonesCount} zone{zonesCount > 1 ? "s" : ""} analysée{zonesCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="font-data text-[28px] font-medium text-text">{result.score}</p>
              <p className="text-xs text-text-faint">Score de densité</p>
            </Card>
            <Card className="text-center">
              <p className="font-data text-[28px] font-medium text-accent">{result.norwood || "?"}</p>
              <p className="text-xs text-text-faint">Stade estimé</p>
            </Card>
            <Card className="text-center">
              <p className="font-data text-[18px] font-medium text-text leading-tight">
                {result.zones?.slice(0, 2).join(", ") || "Aucune"}
              </p>
              <p className="text-xs text-text-faint">Zones à surveiller</p>
            </Card>
          </div>

          <p className="text-center text-base text-text-muted">
            Voyons où tu en es.
          </p>

          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push("/resultat")}
          >
            Voir mon score
          </Button>

          <Disclaimer className="justify-center" />
        </div>
      </main>
    );
  }

  return null;
}
