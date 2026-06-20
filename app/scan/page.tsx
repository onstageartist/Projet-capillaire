"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { compressImage } from "@/lib/compress-image";
import { Button, Checkbox, Disclaimer, ScanAnimation } from "@/components/ui";

const SCAN_STEPS = [
  "Analyse de la densité…",
  "Détection des zones fragiles…",
  "Estimation du stade…",
  "Construction de ton bilan…",
];

const MIN_ANIMATION_MS = 4000;

export default function Scan() {
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState("");
  const [scanning, setScanning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const advanceSteps = useCallback(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < SCAN_STEPS.length) {
        setAnimStep(step);
      } else {
        clearInterval(interval);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo trop lourde (max 10 Mo). Essaie avec une autre.");
      return;
    }
    compressImage(file).then((compressed) => {
      fileRef.current = compressed;
      setPreview(URL.createObjectURL(compressed));
    });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileRef.current || !consent) return;

    setScanning(true);
    setAnimStep(0);
    setError("");

    const animStart = Date.now();
    const cleanupAnim = advanceSteps();

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth?next=/scan"); return; }

      // Record photo consent
      await supabase.from("profiles").upsert(
        { id: user.id, photo_consent_at: new Date().toISOString() },
        { onConflict: "id" }
      ).then(() => {});

      trackEvent("photo_uploaded");
      trackEvent("scan_started");

      // Upload photo — generate temp ID for storage path
      const tempId = crypto.randomUUID();
      const path = `${user.id}/${tempId}/original.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("scalp-photos")
        .upload(path, fileRef.current, { contentType: "image/jpeg" });

      if (uploadError) {
        const { error: fallback } = await supabase.storage
          .from("photos")
          .upload(path, fileRef.current, { contentType: "image/jpeg" });
        if (fallback) throw new Error(fallback.message);
      }

      // Call analysis API (also saves to DB)
      const formData = new FormData();
      formData.append("photo", fileRef.current);

      const res = await fetch("/api/scan", { method: "POST", body: formData });
      const result = await res.json();

      if (result.error) {
        trackEvent("scan_failed", { reason: result.error });
        throw new Error(result.error);
      }

      if (result.usable === false) {
        const elapsed = Date.now() - animStart;
        if (elapsed < MIN_ANIMATION_MS) {
          await new Promise((r) => setTimeout(r, MIN_ANIMATION_MS - elapsed));
        }
        cleanupAnim();
        setScanning(false);
        setPreview("");
        fileRef.current = null;
        if (formRef.current) formRef.current.reset();
        setError(result.message || "On n'a pas pu lire cette photo. Reprends-en une avec un peu plus de lumière et la zone bien visible.");
        return;
      }

      const scanId = result.scanId || tempId;

      // Update scan record with photo path
      if (result.scanId) {
        await supabase.from("scans").update({ photo_path: path }).eq("id", result.scanId);
      }

      // Wait for minimum animation time
      const elapsed = Date.now() - animStart;
      if (elapsed < MIN_ANIMATION_MS) {
        await new Promise((r) => setTimeout(r, MIN_ANIMATION_MS - elapsed));
      }

      setAnimStep(SCAN_STEPS.length);

      trackEvent("scan_completed", { score: result.score });

      sessionStorage.setItem("scanResult", JSON.stringify(result));
      sessionStorage.setItem("scanPhotoPath", path);

      // Trigger projection async (non-blocking)
      fetch("/api/projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, photoPath: path }),
      }).catch(() => {});

      setTimeout(() => router.push("/resultat"), 600);
    } catch (err: unknown) {
      cleanupAnim();
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(msg);
      setScanning(false);
    }
  }

  if (scanning) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <ScanAnimation
          photoUrl={preview}
          steps={SCAN_STEPS}
          currentStep={animStep}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        <div>
          <h1 className="text-[26px] font-bold text-text">
            Ton scan capillaire
          </h1>
          <p className="mt-2 text-text-muted">
            Prends une photo de ton cuir chevelu pour obtenir ton bilan.
          </p>
        </div>

        {/* Consent */}
        <div className="rounded-[16px] border border-border bg-surface p-5 space-y-3">
          <Checkbox
            label="J'accepte que ma photo soit analysée pour générer mon bilan. Elle reste privée, hébergée en Europe, et je peux la supprimer quand je veux."
            checked={consent}
            onChange={() => setConsent(!consent)}
          />
          <Disclaimer />
        </div>

        {/* Tips */}
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <p className="text-sm font-semibold text-text">Pour un bon scan :</p>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {[
              "Bonne lumière, de préférence naturelle",
              "Cheveux comme d'habitude (ou légèrement écartés)",
              "Cadre la zone qui t'inquiète",
              "Pas de casquette, photo nette",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <label className={`flex cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed p-10 transition-all ${
            consent
              ? "border-border bg-surface hover:border-accent hover:bg-accent-soft"
              : "border-border/50 bg-surface/50 opacity-50 cursor-not-allowed"
          }`}>
            {preview ? (
              <div className="space-y-3 text-center">
                <img src={preview} alt="Aperçu" className="max-h-64 rounded-[12px]" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setPreview("");
                    fileRef.current = null;
                    if (formRef.current) formRef.current.reset();
                  }}
                  className="text-sm text-text-muted hover:text-text"
                >
                  Reprendre
                </button>
              </div>
            ) : (
              <>
                <svg className="h-12 w-12 text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <span className="mt-3 text-sm font-medium text-text">
                  Prendre une photo ou importer
                </span>
                <span className="mt-1 text-xs text-text-faint">
                  JPG, PNG ou WebP
                </span>
              </>
            )}
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
              disabled={!consent}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {error && (
            <div className="rounded-[12px] border border-danger/20 bg-danger/5 p-3 space-y-2">
              <p className="text-sm text-danger">{error}</p>
              <button
                type="button"
                onClick={() => { setError(""); setScanning(false); }}
                className="text-sm font-medium text-accent hover:underline"
              >
                Réessayer
              </button>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!preview || !consent}
          >
            Lancer le scan
          </Button>
        </form>
      </div>
    </main>
  );
}
