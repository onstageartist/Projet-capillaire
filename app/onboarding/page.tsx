"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";

interface Step {
  question: string;
  subtitle: string;
  key: string;
  options: { label: string; value: string }[];
}

const STEPS: Step[] = [
  {
    question: "Depuis quand remarques-tu une perte ?",
    subtitle: "Pas de jugement — chaque parcours est différent.",
    key: "duration",
    options: [
      { label: "Moins d'un an", value: "less_1y" },
      { label: "1 à 3 ans", value: "1_3y" },
      { label: "Plus de 3 ans", value: "more_3y" },
    ],
  },
  {
    question: "Quelle zone t'inquiète le plus ?",
    subtitle: "On analysera cette zone en priorité.",
    key: "zone",
    options: [
      { label: "Les golfes", value: "golfes" },
      { label: "Le dessus du crâne", value: "vertex" },
      { label: "La ligne frontale", value: "frontale" },
      { label: "Un peu partout", value: "general" },
    ],
  },
  {
    question: "As-tu déjà essayé un traitement ?",
    subtitle: "Ça nous aide à adapter nos recommandations.",
    key: "treatment",
    options: [
      { label: "Non, jamais", value: "no" },
      { label: "Oui, sans résultat", value: "yes_no_result" },
      { label: "Oui, avec des résultats", value: "yes_with_result" },
    ],
  },
  {
    question: "Ton objectif principal ?",
    subtitle: "Il n'y a pas de mauvaise réponse.",
    key: "goal",
    options: [
      { label: "Stopper la chute", value: "stop" },
      { label: "Faire repousser", value: "regrow" },
      { label: "Juste comprendre où j'en suis", value: "understand" },
    ],
  },
];

const TOTAL = STEPS.length + 1;

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const progress = ((current + 1) / TOTAL) * 100;

  const selectOption = useCallback(
    (key: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
      setDirection("next");
      setTimeout(() => setCurrent((c) => c + 1), 200);
    },
    []
  );

  const goBack = useCallback(() => {
    if (current > 0) {
      setDirection("prev");
      setCurrent((c) => c - 1);
    }
  }, [current]);

  async function handleFinish() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("onboarding").upsert(
        {
          user_id: user.id,
          duration: answers.duration,
          zone: answers.zone,
          treatment: answers.treatment,
          goal: answers.goal,
        },
        { onConflict: "user_id" }
      );
    }

    trackEvent("onboarding_complete");
    router.push("/scan");
  }

  const isFinal = current >= STEPS.length;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1 w-full rounded-full bg-border">
            <div
              className="h-1 rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {current + 1} / {TOTAL}
          </p>
        </div>

        {/* Content */}
        <div
          key={current}
          className={`animate-fade-in ${
            direction === "next" ? "animate-slide-left" : "animate-slide-right"
          }`}
        >
          {!isFinal ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {STEPS[current].question}
                </h1>
                <p className="mt-2 text-sm text-muted">
                  {STEPS[current].subtitle}
                </p>
              </div>

              <div className="space-y-3">
                {STEPS[current].options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => selectOption(STEPS[current].key, option.value)}
                    className={`w-full rounded-lg border px-5 py-4 text-left text-sm font-medium transition-all ${
                      answers[STEPS[current].key] === option.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-foreground hover:border-accent/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
                🔬
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                On va analyser ton cuir chevelu
              </h1>
              <p className="text-muted">
                En quelques secondes, tu auras un score de densité, ton stade
                Norwood, les zones à surveiller et des recommandations
                personnalisées. C'est ton point de départ.
              </p>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="w-full rounded-lg bg-accent py-3.5 text-lg font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Lancer mon scan"}
              </button>
            </div>
          )}
        </div>

        {/* Back button */}
        {current > 0 && (
          <button
            onClick={goBack}
            className="mt-6 text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Retour
          </button>
        )}
      </div>
    </main>
  );
}
