"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";

const ERROR_MAP: Record<string, string> = {
  "User already registered": "Cet email est déjà utilisé.",
  "Invalid login credentials": "Email ou mot de passe incorrect.",
  "Email not confirmed": "Confirme ton email avant de te connecter.",
  "Password should be at least 6 characters":
    "Le mot de passe doit faire au moins 6 caractères.",
  "Unable to validate email address: invalid format":
    "Format d'email invalide.",
};

function humanError(msg: string): string {
  return ERROR_MAP[msg] ?? msg;
}

export default function Auth() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        </main>
      }
    >
      <AuthInner />
    </Suspense>
  );
}

function AuthInner() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/scan";

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${next}`,
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/confirm` },
      });
      if (error) {
        setMessage(humanError(error.message));
      } else {
        trackEvent("inscription");
        setIsSuccess(true);
        setMessage("Vérifie ta boîte mail pour confirmer ton inscription.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(humanError(error.message));
      } else {
        router.push(next);
      }
    }

    setLoading(false);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {mode === "login" ? "Connexion" : "Inscription"}
        </h1>

        <button
          type="button"
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface py-3 font-medium text-foreground transition-colors hover:bg-border"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            placeholder={
              mode === "signup"
                ? "Mot de passe (min. 6 caractères)"
                : "Mot de passe"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-3 font-medium text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading
              ? "Chargement…"
              : mode === "login"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>

          {message && (
            <p
              className={`text-sm ${isSuccess ? "text-accent" : "text-signal"}`}
            >
              {message}
            </p>
          )}
        </form>

        <p className="text-sm text-muted">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className="text-accent hover:underline"
              >
                S'inscrire
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                className="text-accent hover:underline"
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
