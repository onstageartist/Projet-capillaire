import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ marketing_consent: false })
      .eq("id", user.id);
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0E0F12;color:#F2F3F5;display:flex;align-items:center;justify-content:center;min-height:100vh;"><div style="text-align:center;"><h1 style="font-size:22px;">Désinscription confirmée</h1><p style="color:#9AA0A8;">Tu ne recevras plus d'emails marketing de Scalpy.</p><a href="/" style="color:#16B981;">Retour à l'accueil</a></div></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
