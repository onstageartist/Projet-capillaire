"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";

const SCAN_STEPS = [
  "Lecture de l'image…",
  "Analyse de la densité capillaire…",
  "Détection des zones clairsemées…",
  "Calcul du stade Norwood…",
  "Évaluation des follicules actifs…",
  "Génération des recommandations…",
];

function ScanAnimation({ preview }: { preview: string }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % SCAN_STEPS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Photo with scan effect */}
      <div className="relative mx-auto w-72 overflow-hidden rounded-2xl border border-border">
        <img
          src={preview}
          alt="Scan en cours"
          className="block w-full"
        />
        {/* Scan line */}
        <div className="scan-line absolute left-0 h-1 w-full shadow-[0_0_20px_6px_rgba(52,211,153,0.5)]" />
        {/* Overlay grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_2px,rgba(10,10,12,0.03)_2px)] bg-[length:100%_4px]" />
        {/* Corner markers */}
        <div className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-accent" />
        <div className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-accent" />
        <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-accent" />
        <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-accent" />
        {/* Pulse overlay */}
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-accent/5" />
      </div>

      {/* Steps */}
      <div className="flex flex-col items-center space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          <p
            key={stepIndex}
            className="animate-slide-left text-sm font-medium text-accent"
          >
            {SCAN_STEPS[stepIndex]}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {SCAN_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                i <= stepIndex ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Scan() {
  const [preview, setPreview] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<File | null>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      fileRef.current = file;
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileRef.current) return;

    setScanning(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth?next=/scan");
        return;
      }

      // 1. Upload photo to Supabase Storage
      const ext = fileRef.current.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, fileRef.current, { contentType: fileRef.current.type });

      if (uploadError) throw new Error(uploadError.message);

      // 2. Call scan API
      const formData = new FormData();
      formData.append("photo", fileRef.current);

      const res = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.error) throw new Error(result.error);

      // 3. Save scan to Supabase
      const norwoodMap: Record<string, number> = {
        I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
      };

      const { error: insertError } = await supabase.from("scans").insert({
        user_id: user.id,
        score: result.score,
        norwood: norwoodMap[result.norwood] || null,
        zones: result.zones,
        photo_url: path,
      });

      if (insertError) throw new Error(insertError.message);

      trackEvent("scan_complete");

      sessionStorage.setItem("scanResult", JSON.stringify(result));
      router.push("/resultat");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(msg);
      setScanning(false);
    }
  }

  if (scanning) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <ScanAnimation preview={preview} />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Scan capillaire
          </h1>
          <p className="mt-2 text-muted">
            Prends une photo nette du dessus de ton crâne, bien éclairée, à
            environ 20 cm.
          </p>
        </div>

        {/* Tips */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">
            Pour un bon scan :
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-accent">✓</span>
              Lumière naturelle ou forte, pas de contre-jour
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✓</span>
              Cheveux secs, non coiffés, au naturel
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✓</span>
              Montre la zone qui t'inquiète (dessus, golfes, front)
            </li>
            <li className="flex gap-2">
              <span className="text-signal">✗</span>
              Pas de casquette, pas de filtre, pas de flou
            </li>
          </ul>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface p-10 transition-all hover:border-accent hover:bg-accent/5">
            {preview ? (
              <img
                src={preview}
                alt="Aperçu"
                className="max-h-64 rounded-lg"
              />
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl">
                  📷
                </div>
                <span className="mt-3 text-sm font-medium text-foreground">
                  Choisis ou prends une photo
                </span>
                <span className="mt-1 text-xs text-muted">
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
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview("");
                fileRef.current = null;
                if (formRef.current) formRef.current.reset();
              }}
              className="text-sm text-muted hover:text-foreground"
            >
              Changer de photo
            </button>
          )}

          {error && (
            <p className="rounded-lg border border-signal/20 bg-signal/5 p-3 text-sm text-signal">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!preview}
            className="w-full rounded-lg bg-accent py-3.5 text-lg font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            Lancer le scan
          </button>
        </form>
      </div>
    </main>
  );
}
