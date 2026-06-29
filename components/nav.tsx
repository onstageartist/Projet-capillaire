"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { useAuthState } from "@/lib/use-auth-state";

export default function Nav() {
  const router = useRouter();
  const { show } = useToast();
  const auth = useAuthState();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    show("Déconnecté");
    router.push("/");
  }

  const link =
    "rounded-[12px] px-3 py-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text";
  const cta =
    "ml-1 rounded-[var(--radius-md)] bg-accent px-4 py-1.5 font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:ml-2";

  // Pendant la resolution, on reserve la place sans clignoter.
  if (auth === "loading") {
    return <nav className="flex h-8 items-center" aria-hidden />;
  }

  // Visiteur : navigation vitrine. "Scanner" passe par l'onboarding (le bon depart).
  if (auth === "out") {
    return (
      <nav className="flex items-center gap-1 text-sm sm:gap-3">
        <Link href="/#comment" className={`hidden sm:block ${link}`}>Comment ça marche</Link>
        <Link href="/blog" className={`hidden sm:block ${link}`}>Journal</Link>
        <Link href="/auth" className={link}>Connexion</Link>
        <Link href="/onboarding" className={cta}>Scanner gratuitement</Link>
      </nav>
    );
  }

  // Connecte : navigation applicative.
  return (
    <nav className="flex items-center gap-1 text-sm sm:gap-3">
      {auth === "subscriber" && (
        <Link href="/app" className={link}>Mon espace</Link>
      )}
      <Link href="/scan" className={link}>Scanner</Link>
      <Link href="/suivi" className={`hidden sm:block ${link}`}>Suivi</Link>
      {auth === "free" && (
        <Link href="/plus" className={`hidden sm:block ${link}`}>Offres</Link>
      )}
      <button
        onClick={handleLogout}
        className="ml-1 rounded-[12px] border border-border px-4 py-1.5 font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text sm:ml-2"
      >
        Déconnexion
      </button>
    </nav>
  );
}
