import { createClient } from "@/lib/supabase/client";

export async function trackEvent(name: string, meta?: Record<string, string>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("events").insert({
    user_id: user.id,
    name,
    meta: meta ?? {},
  });
}
