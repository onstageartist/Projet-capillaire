"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RadioCard, ProgressBar, Button } from "@/components/ui";
import { trackEvent } from "@/lib/track";
import AuthForm from "@/components/auth-form";

interface QuizStep {
  question: string;
  key: string;
  options: string[];
  feedback: string;
}

const QUIZ: QuizStep[] = [
  {
    question: "Depuis combien de temps tu remarques un changement ?",
    key: "duree",
    options: ["Moins d'un an", "1 à 3 ans", "Plus de 3 ans", "Je ne suis pas sûr"],
    feedback: "Noté. Plus tu agis tôt, plus c'est simple de suivre l'évolution.",
  },
  {
    question: "Quelle zone t'inquiète le plus ?",
    key: "zone",
    options: ["Les golfes", "Le dessus du crâne", "La ligne frontale", "Un peu partout"],
    feedback: "OK. Ton scan va justement cartographier cette zone précisément.",
  },
  {
    question: "Comment tu le vis au quotidien ?",
    key: "vecu",
    options: ["Ça me préoccupe souvent", "De temps en temps", "Je veux surtout anticiper"],
    feedback: "Tu fais bien d'en avoir le coeur net. On va te donner des repères clairs.",
  },
  {
    question: "Tu as déjà essayé quelque chose ?",
    key: "deja_essaye",
    options: ["Non, jamais", "Oui, sans vrai résultat", "Oui, avec un peu de résultat"],
    feedback: "Compris. On va partir de là où tu en es, sans repartir de zéro.",
  },
  {
    question: "C'est quoi ton objectif principal ?",
    key: "objectif",
    options: ["Stopper la chute", "Densifier", "Comprendre où j'en suis et suivre"],
    feedback: "Clair. Tout ton bilan va être orienté vers ça.",
  },
];

const TOTAL_SCREENS = QUIZ.length + 1;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const router = useRouter();

  useEffect(() => {
    trackEvent("onboarding_started");
  }, []);

  const progress = ((step + 1) / TOTAL_SCREENS) * 100;
  const isSignup = step >= QUIZ.length;

  const saveToServer = useCallback(async (data: Record<string, string>, currentStep: number) => {
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: data, step: currentStep }),
      });
    } catch {
      // non-blocking
    }
  }, []);

  const selectOption = useCallback(
    (key: string, value: string) => {
      const updated = { ...answers, [key]: value };
      setAnswers(updated);
      setShowFeedback(true);

      trackEvent("quiz_step_completed", { step: key, answer: value });
      saveToServer(updated, step);

      setTimeout(() => {
        setShowFeedback(false);
        setDirection("next");
        setStep((s) => s + 1);
      }, 1200);
    },
    [answers, step, saveToServer]
  );

  const goBack = useCallback(() => {
    if (step > 0) {
      setShowFeedback(false);
      setDirection("prev");
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleAuthSuccess = useCallback(async () => {
    trackEvent("onboarding_completed");
    router.push("/scan");
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-md">
        <ProgressBar value={progress} className="mb-2" />
        <p className="mb-8 text-xs text-text-faint">
          {step + 1} / {TOTAL_SCREENS}
        </p>

        <div
          key={step}
          className={direction === "next" ? "animate-slide-left" : "animate-slide-right"}
        >
          {!isSignup ? (
            <div className="space-y-6">
              <h1 className="text-[26px] font-bold leading-[1.2] text-text">
                {QUIZ[step].question}
              </h1>

              <div className="space-y-2.5" role="radiogroup">
                {QUIZ[step].options.map((opt) => (
                  <RadioCard
                    key={opt}
                    label={opt}
                    selected={answers[QUIZ[step].key] === opt}
                    onClick={() => selectOption(QUIZ[step].key, opt)}
                  />
                ))}
              </div>

              {showFeedback && (
                <p className="animate-fade-in text-sm text-accent">
                  {QUIZ[step].feedback}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-[26px] font-bold leading-[1.2] text-text">
                Parfait. On a ce qu'il faut pour personnaliser ton bilan.
              </h1>
              <p className="text-base text-text-muted">
                Crée ton compte en 30 secondes pour lancer ton scan et garder
                tes résultats.
              </p>
              <AuthForm mode="signup" onSuccess={handleAuthSuccess} />
              <p className="text-xs text-text-faint">
                Tes réponses et tes photos restent privées, hébergées en Europe.
              </p>
            </div>
          )}
        </div>

        {step > 0 && !showFeedback && (
          <button
            onClick={goBack}
            className="mt-6 text-sm text-text-muted transition-colors hover:text-text"
          >
            ← Retour
          </button>
        )}
      </div>
    </main>
  );
}
