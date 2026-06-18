"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Scan() {
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      sessionStorage.setItem("scanResult", JSON.stringify(json));
      router.push("/resultat");
    } catch {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Scan capillaire
        </h1>
        <p className="text-muted">
          Prends une photo nette de ton cuir chevelu (dessus, golfes ou tempes)
          et lance l'analyse.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface p-8 transition-colors hover:border-accent">
            <span className="text-3xl">📷</span>
            <span className="mt-2 text-sm text-muted">
              {preview ? "Changer de photo" : "Choisis ou prends une photo"}
            </span>
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
            <img
              src={preview}
              alt="Aperçu"
              className="mx-auto max-h-64 rounded-lg border border-border"
            />
          )}

          <button
            type="submit"
            disabled={loading || !preview}
            className="w-full rounded-lg bg-accent py-3 font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Analyse en cours…" : "Lancer le scan"}
          </button>
        </form>
      </div>
    </main>
  );
}
