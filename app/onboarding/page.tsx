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
    question: "Depuis combien de temps tu remarques que ça se dégarnit ?",
    key: "anciennete",
    options: [
      "Quelques mois",
      "Un à deux ans",
      "Plus de deux ans",
      "Je ne suis pas sûr, c'est ce que je veux savoir",
    ],
    feedback: "Noté. Plus tu agis tôt, plus c'est simple de suivre l'évolution.",
  },
  {
    question: "Où ça t'inquiète le plus ?",
    key: "zone",
    options: [
      "Les golfes, à l'avant",
      "Le sommet, la couronne",
      "Toute la zone",
      "Je n'arrive pas à situer",
    ],
    feedback: "OK. Ton scan va justement cartographier cette zone.",
  },
  {
    question: "Qu'est-ce qui t'amène aujourd'hui ?",
    key: "declencheur",
    options: [
      "Une photo de moi qui m'a choqué",
      "Une remarque qu'on m'a faite",
      "Je veux agir avant que ça empire",
      "Je suis ça depuis un moment",
    ],
    feedback: "Compris. On va te donner des repères clairs.",
  },
  {
    question: "Tu as déjà tenté quelque chose ?",
    key: "deja_essaye",
    options: [
      "Rien pour l'instant",
      "Shampoings et compléments",
      "Minoxidil ou finastéride",
      "Un peu de tout, sans savoir si ça marche",
    ],
    feedback: "On va partir de là où tu en es.",
  },
  {
    question: "Ton objectif, c'est quoi ?",
    key: "objectif",
    options: [
      "Savoir où j'en suis exactement",
      "Ralentir la chute",
      "Reprendre de la densité",
      "Suivre si mon traitement marche",
    ],
    feedback: "Tout ton bilan va être orienté vers ça.",
  },
];

const TOTAL_SCREENS = QUIZ.length + 2; // 5 questions + transition + account

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
  const isTransition = step === QUIZ.length;
  const isSignup = step === QUIZ.length + 1;

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
          {!isTransition && !isSignup ? (
            <div className="space-y-6">
              <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text">
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
          ) : isTransition ? (
            <div className="space-y-6">
              <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text">
                On a ce qu'il faut. Reste à mesurer pour de vrai où en sont tes cheveux.
              </h1>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  trackEvent("quiz_completed");
                  setDirection("next");
                  setStep((s) => s + 1);
                }}
              >
                Lancer mon bilan
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="font-display text-[26px] font-semibold leading-[1.08] tracking-[-0.01em] text-text">
                Crée ton espace pour recevoir ton bilan
              </h1>
              <p className="text-base text-text-muted">
                Ton bilan et ton suivi sont liés à ton compte. Trente secondes, et c'est à toi.
              </p>
              <AuthForm mode="signup" onSuccess={handleAuthSuccess} />
              <p className="text-xs text-text-faint">
                Tes photos restent privées. Tu peux tout supprimer quand tu veux.
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
