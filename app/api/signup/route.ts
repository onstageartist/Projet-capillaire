import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Création de compte SANS confirmation d'email (zéro friction) : on crée
// l'utilisateur côté serveur avec email_confirm forcé, il peut se connecter
// immédiatement. La connexion se fait ensuite côté client.
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      const already =
        error.message?.toLowerCase().includes("already") ||
        error.status === 422;
      return NextResponse.json(
        { error: already ? "Cet email est déjà utilisé." : error.message },
        { status: already ? 409 : 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
