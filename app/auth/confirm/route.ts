import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "email",
      token_hash,
    });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Link onboarding responses to user via session cookie
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("scalpy_sid")?.value;
        if (sessionId) {
          const admin = createAdminClient();
          await admin
            .from("onboarding_responses")
            .update({ user_id: user.id })
            .eq("session_id", sessionId)
            .is("user_id", null);
        }

        // Send welcome email
        try {
          const { sendEmail, emailWelcome } = await import("@/lib/email/resend");
          if (user.email) {
            await sendEmail({ to: user.email, ...emailWelcome() });
          }
        } catch {}
      }

      return NextResponse.redirect(new URL("/scan", request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth", request.url));
}
