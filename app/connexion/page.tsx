"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-semibold text-zinc-50">Connexion</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-50 py-3 font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>

        {message && (
          <p className="text-sm text-zinc-400">{message}</p>
        )}

        <p className="text-sm text-zinc-500">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-zinc-50 hover:underline">
            S'inscrire
          </Link>
        </p>
      </form>
    </main>
  );
}
