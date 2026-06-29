import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  emailScanAbandoned,
  emailPaywallAbandoned,
  emailProgramNudge,
  emailRescanReminder,
} from "@/lib/email/resend";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail-closed : sans secret configuré, l'endpoint reste fermé (sinon n'importe
  // qui peut déclencher un envoi d'emails en masse).
  if (!cronSecret) {
    console.error("[CRON emails] CRON_SECRET non configuré : endpoint fermé.");
    return NextResponse.json({ error: "Service indisponible" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const sent: string[] = [];

  try {
    // 1. Scan abandoned (signed up 1h+ ago, no scan done)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: noScanUsers } = await supabase
      .from("profiles")
      .select("id, email")
      .lt("created_at", oneHourAgo);

    if (noScanUsers) {
      for (const user of noScanUsers) {
        if (!user.email) continue;
        const { data: scan } = await supabase
          .from("scans")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "done")
          .limit(1)
          .single();

        if (!scan) {
          const { data: alreadySent } = await supabase
            .from("email_log")
            .select("id")
            .eq("user_id", user.id)
            .eq("type", "scan_abandoned")
            .single();

          if (!alreadySent) {
            const email = emailScanAbandoned();
            await sendEmail({ to: user.email, ...email });
            await supabase.from("email_log").insert({ user_id: user.id, type: "scan_abandoned" });
            sent.push(`scan_abandoned:${user.email}`);
          }
        }
      }
    }

    // 2. Rescan reminder (last scan 30+ days ago, active sub)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active");

    if (activeSubs) {
      for (const sub of activeSubs) {
        const { data: lastScan } = await supabase
          .from("scans")
          .select("created_at")
          .eq("user_id", sub.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastScan && lastScan.created_at < thirtyDaysAgo) {
          const { data: alreadySent } = await supabase
            .from("email_log")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("type", "rescan_reminder")
            .gt("created_at", thirtyDaysAgo)
            .single();

          if (!alreadySent) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", sub.user_id)
              .single();

            if (profile?.email) {
              const email = emailRescanReminder();
              await sendEmail({ to: profile.email, ...email });
              await supabase.from("email_log").insert({ user_id: sub.user_id, type: "rescan_reminder" });
              sent.push(`rescan:${profile.email}`);
            }
          }
        }
      }
    }
    // 3. Paywall abandoned (scan done, paywall viewed, no purchase, marketing consent)
    const { data: paywallViewers } = await supabase
      .from("events")
      .select("user_id")
      .eq("name", "paywall_viewed")
      .not("user_id", "is", null);

    if (paywallViewers) {
      const viewerIds = [...new Set(paywallViewers.map((e: { user_id: string }) => e.user_id))];
      for (const userId of viewerIds) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .single();

        if (sub?.status === "active") continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("email, marketing_consent")
          .eq("id", userId)
          .single();

        if (!profile?.email || !profile.marketing_consent) continue;

        const { data: alreadySent } = await supabase
          .from("email_log")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "paywall_abandoned")
          .single();

        if (!alreadySent) {
          const { data: onb } = await supabase
            .from("onboarding_responses")
            .select("answers")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const objectif = onb?.answers?.objectif?.toLowerCase() || "avancer";
          const email = emailPaywallAbandoned(objectif);
          await sendEmail({ to: profile.email, ...email });
          await supabase.from("email_log").insert({ user_id: userId, type: "paywall_abandoned" });
          sent.push(`paywall_abandoned:${profile.email}`);
        }
      }
    }

    // 4. Program nudge (active sub, days 1/3/7)
    if (activeSubs) {
      for (const sub of activeSubs) {
        const { data: subDetail } = await supabase
          .from("subscriptions")
          .select("created_at")
          .eq("user_id", sub.user_id)
          .eq("status", "active")
          .single();

        if (!subDetail) continue;
        const daysSince = Math.floor((Date.now() - new Date(subDetail.created_at).getTime()) / (1000 * 60 * 60 * 24));

        for (const nudgeDay of [1, 3, 7]) {
          if (daysSince !== nudgeDay) continue;
          const nudgeType = `program_nudge_j${nudgeDay}`;

          const { data: alreadySent } = await supabase
            .from("email_log")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("type", nudgeType)
            .single();

          if (!alreadySent) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", sub.user_id)
              .single();

            if (profile?.email) {
              const email = emailProgramNudge(nudgeDay);
              await sendEmail({ to: profile.email, ...email });
              await supabase.from("email_log").insert({ user_id: sub.user_id, type: nudgeType });
              sent.push(`${nudgeType}:${profile.email}`);
            }
          }
        }
      }
    }

    // 5. Win-back (subscription expired/canceled, marketing consent)
    const { data: canceledSubs } = await supabase
      .from("subscriptions")
      .select("user_id")
      .in("status", ["canceled", "expired"]);

    if (canceledSubs) {
      for (const sub of canceledSubs) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, marketing_consent")
          .eq("id", sub.user_id)
          .single();

        if (!profile?.email || !profile.marketing_consent) continue;

        const { data: alreadySent } = await supabase
          .from("email_log")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("type", "winback")
          .single();

        if (!alreadySent) {
          const { emailWinback } = await import("@/lib/email/resend");
          const email = emailWinback();
          await sendEmail({ to: profile.email, ...email });
          await supabase.from("email_log").insert({ user_id: sub.user_id, type: "winback" });
          sent.push(`winback:${profile.email}`);
        }
      }
    }
  } catch (e) {
    console.error("Cron email error:", e);
  }

  return NextResponse.json({ sent, timestamp: new Date().toISOString() });
}
