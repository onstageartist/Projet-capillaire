"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Etat de session partage par la navigation, pour montrer le bon menu :
// - "out"        : visiteur non connecte (site vitrine)
// - "free"       : connecte sans abonnement actif (a fait/peut faire son scan)
// - "subscriber" : abonnement actif (a acces a son espace /app)
export type AuthState = "loading" | "out" | "free" | "subscriber";

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function resolve() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setState("out"); return; }
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setState(sub?.status === "active" ? "subscriber" : "free");
    }

    resolve();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => resolve());
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return state;
}
