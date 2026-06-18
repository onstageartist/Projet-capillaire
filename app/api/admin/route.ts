import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "mathias.stephant@gmail.com";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: events } = await supabase
    .from("events")
    .select("name, meta")
    .gte("created_at", todayISO);

  const rows = events ?? [];

  const stats = {
    inscriptions: rows.filter((e) => e.name === "inscription").length,
    onboarding: rows.filter((e) => e.name === "onboarding_complete").length,
    scans: rows.filter((e) => e.name === "scan_complete").length,
    paywall_views: rows.filter((e) => e.name === "paywall_view").length,
    offer_clicks: rows.filter((e) => e.name === "offer_click").length,
    offer_detail: {
      plus: rows.filter(
        (e) => e.name === "offer_click" && (e.meta as Record<string, string>)?.plan === "plus"
      ).length,
      pro: rows.filter(
        (e) => e.name === "offer_click" && (e.meta as Record<string, string>)?.plan === "pro"
      ).length,
    },
  };

  return NextResponse.json(stats);
}
