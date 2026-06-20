import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/scan";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const createdAt = new Date(data.user.created_at);
      const isNew = Date.now() - createdAt.getTime() < 60_000;
      if (isNew) {
        await supabase.from("events").insert({
          user_id: data.user.id,
          name: "inscription",
          props: { provider: "google" },
        });

        // Send welcome email
        try {
          const { sendEmail, emailWelcome } = await import("@/lib/email/resend");
          if (data.user.email) {
            await sendEmail({ to: data.user.email, ...emailWelcome() });
          }
        } catch {}
      }

      // Link onboarding responses to user via session cookie
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("scalpy_sid")?.value;
      if (sessionId) {
        const admin = createAdminClient();
        await admin
          .from("onboarding_responses")
          .update({ user_id: data.user.id })
          .eq("session_id", sessionId)
          .is("user_id", null);
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/auth", origin));
}
