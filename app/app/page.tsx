"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { Button, Card, Gauge, ProgressBar, Badge, Disclaimer, ScoreMark, TrendChart } from "@/components/ui";

interface ScanHistory {
  id: string;
  score: number;
  norwood: string;
  created_at: string;
}

interface ProjectionData {
  originalUrl: string | null;
  fullUrl: string | null;
}

interface QuizAnswers {
  objectif?: string;
  zone?: string;
  deja_essaye?: string;
}

const DEFAULT_WEEKS = [
  { week: 1, pillar: "Soin du cuir chevelu", tasks: ["Shampoing doux sans sulfate", "Séchage naturel (pas de chaleur)", "Massage léger du cuir chevelu 2 min"] },
  { week: 2, pillar: "Nutrition", tasks: ["Ajouter des protéines à chaque repas", "Un aliment riche en zinc par jour", "Boire 1,5L d'eau minimum"] },
  { week: 3, pillar: "Sommeil et stress", tasks: ["Se coucher à heure régulière", "5 min de respiration avant de dormir", "30 min d'activité physique"] },
  { week: 4, pillar: "Routine consolidée", tasks: ["Continuer le shampoing doux", "Taie d'oreiller en satin/soie", "Éviter les coiffures trop serrées"] },
];

function buildPersonalizedProgram(quiz: QuizAnswers, recommendations: string[]) {
  const weeks = DEFAULT_WEEKS.map((w) => ({ ...w, tasks: [...w.tasks] }));

  if (quiz.zone === "vertex" || quiz.zone === "dessus") {
    weeks[0].tasks[2] = "Massage ciblé du vertex 2 min, mouvements circulaires";
  } else if (quiz.zone === "golfes" || quiz.zone === "frontale") {
    weeks[0].tasks[2] = "Massage ciblé des golfes et de la ligne frontale 2 min";
  }

  if (quiz.objectif === "freiner" || quiz.objectif === "stabiliser") {
    weeks[1].pillar = "Nutrition anti-chute";
    weeks[1].tasks[0] = "Aliment riche en biotine chaque jour (oeuf, noix)";
  } else if (quiz.objectif === "densifier" || quiz.objectif === "repousser") {
    weeks[1].pillar = "Nutrition densité";
    weeks[1].tasks[1] = "Aliment riche en fer + vitamine C à chaque repas";
  }

  if (quiz.deja_essaye === "rien" || !quiz.deja_essaye) {
    weeks[3].tasks[0] = "Adopter un soin sans rinçage adapté";
  }

  if (recommendations.length > 0) {
    const rec = recommendations[0];
    if (rec.toLowerCase().includes("stress") || rec.toLowerCase().includes("sommeil")) {
      weeks[2].tasks.unshift(rec);
      weeks[2].tasks.pop();
    }
  }

  return weeks;
}

export default function AppPage() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [taskDates, setTaskDates] = useState<Map<string, string>>(new Map());
  const [currentDay, setCurrentDay] = useState(1);
  const [projection, setProjection] = useState<ProjectionData>({ originalUrl: null, fullUrl: null });
  const [programWeeks, setProgramWeeks] = useState(DEFAULT_WEEKS);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const router = useRouter();

  useEffect(() => {
    trackEvent("app_viewed");

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth"); return; }

      // Check subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, created_at")
        .eq("user_id", user.id)
        .single();

      if (!sub || sub.status !== "active") {
        router.push("/plus");
        return;
      }

      setSubscribed(true);

      // Load marketing consent
      const { data: profile } = await supabase
        .from("profiles")
        .select("marketing_consent")
        .eq("id", user.id)
        .single();
      if (profile) setMarketingConsent(profile.marketing_consent ?? true);

      // Calculate current day
      const start = new Date(sub.created_at);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      setCurrentDay(Math.min(diff + 1, 30));

      // Load scan history
      const { data: scanData } = await supabase
        .from("scans")
        .select("id, score, norwood, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (scanData) setScans(scanData);

      // Load quiz answers for personalization
      const { data: onb } = await supabase
        .from("onboarding_responses")
        .select("answers")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const quizAnswers: QuizAnswers = onb?.answers ?? {};
      const latestRecs: string[] = scanData?.length
        ? (await supabase
            .from("scans")
            .select("recommendations")
            .eq("id", scanData[scanData.length - 1].id)
            .single()
          ).data?.recommendations ?? []
        : [];

      setProgramWeeks(buildPersonalizedProgram(quizAnswers, latestRecs));

      // Load progress
      const { data: progress } = await supabase
        .from("program_progress")
        .select("task_id, created_at")
        .eq("user_id", user.id)
        .eq("done", true);

      if (progress) {
        setCompletedTasks(new Set(progress.map((p: { task_id: string }) => p.task_id)));
        const dates = new Map<string, string>();
        progress.forEach((p: { task_id: string; created_at: string }) => {
          dates.set(p.task_id, p.created_at);
        });
        setTaskDates(dates);
      }

      // Load projection for latest scan
      if (scanData && scanData.length > 0) {
        const latestScan = scanData[scanData.length - 1];
        const { data: proj } = await supabase
          .from("projections")
          .select("full_path, status")
          .eq("scan_id", latestScan.id)
          .eq("user_id", user.id)
          .single();

        if (proj?.status === "done" && proj.full_path) {
          const { data: fullUrl } = await supabase.storage
            .from("projections")
            .createSignedUrl(proj.full_path, 3600);

          // L'avant = la prise portrait stockee (before.jpg), alignee au pixel
          // avec l'apres inpainte. Repli sur la photo de scan si absente.
          let origUrl: string | null = null;
          const { data: bUrl } = await supabase.storage
            .from("projections")
            .createSignedUrl(`${user.id}/${latestScan.id}/before.jpg`, 3600);
          origUrl = bUrl?.signedUrl ?? null;
          if (!origUrl) {
            const { data: scanRow } = await supabase
              .from("scans")
              .select("photo_path")
              .eq("id", latestScan.id)
              .single();
            if (scanRow?.photo_path) {
              const { data: oUrl } = await supabase.storage
                .from("scalp-photos")
                .createSignedUrl(scanRow.photo_path, 3600);
              origUrl = oUrl?.signedUrl ?? null;
            }
          }

          setProjection({
            originalUrl: origUrl,
            fullUrl: fullUrl?.signedUrl ?? null,
          });
        }
      }
    });
  }, [router]);

  if (subscribed === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <ScoreMark size={44} spin value={0.7} />
        <p className="font-data text-xs uppercase tracking-[0.2em] text-text-faint">Chargement</p>
      </main>
    );
  }

  const currentWeek = Math.min(Math.ceil(currentDay / 7), 4);
  const weekData = programWeeks[currentWeek - 1];
  const totalTasks = programWeeks.reduce((acc, w) => acc + w.tasks.length, 0);
  const progressPercent = Math.round((completedTasks.size / totalTasks) * 100);

  // Calculate streak (consecutive days with at least 1 completed task)
  const daysWithTasks = new Set<string>();
  for (const [, dateStr] of taskDates) {
    daysWithTasks.add(new Date(dateStr).toDateString());
  }
  let streak = 0;
  const d = new Date();
  while (daysWithTasks.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const lastScan = scans[scans.length - 1];
  const nextRescanDate = lastScan
    ? new Date(new Date(lastScan.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  async function toggleTask(taskId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
      await supabase.from("program_progress").delete().eq("user_id", user.id).eq("task_id", taskId);
    } else {
      newCompleted.add(taskId);
      await supabase.from("program_progress").upsert({ user_id: user.id, task_id: taskId, done: true });
      trackEvent("task_completed", { task: taskId });
    }
    setCompletedTasks(newCompleted);
  }

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-8">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">Ton espace</h1>
          <p className="text-sm text-text-muted">
            Jour {currentDay}/30 · Semaine {currentWeek}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="font-data text-[20px] font-medium text-accent">{progressPercent}%</p>
            <p className="text-xs text-text-faint">Programme</p>
          </Card>
          <Card className="text-center">
            <p className="font-data text-[20px] font-medium text-text">{streak}</p>
            <p className="text-xs text-text-faint">Série</p>
          </Card>
          <Card className="text-center">
            <p className="font-data text-[20px] font-medium text-text">{scans.length}</p>
            <p className="text-xs text-text-faint">Scans</p>
          </Card>
        </div>

        <ProgressBar value={progressPercent} />

        {/* Projection (pour abonnés) */}
        {projection.fullUrl && (
          <Card>
            <h2 className="mb-4 text-[17px] font-semibold text-text">
              Ta projection
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {projection.originalUrl && (
                <div>
                  <img src={projection.originalUrl} alt="Avant" className="rounded-[12px] w-full" />
                  <p className="mt-1 text-center text-xs text-text-faint">Avant</p>
                </div>
              )}
              <div>
                <img src={projection.fullUrl} alt="Objectif" className="rounded-[12px] w-full" />
                <p className="mt-1 text-center text-xs text-text-faint">Objectif</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-signal text-center">
              Simulation · objectif visuel, pas une prédiction
            </p>
            <a
              href={projection.fullUrl}
              download="scalpy-projection.jpg"
              className="mt-3 flex items-center justify-center gap-2 rounded-[12px] border border-border py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Télécharger
            </a>
            <Disclaimer className="mt-3 justify-center" />
          </Card>
        )}

        {/* Programme hebdo */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-semibold text-text">
              Semaine {currentWeek} : {weekData.pillar}
            </h2>
            <Badge variant="accent">Actif</Badge>
          </div>
          <div className="space-y-2.5">
            {weekData.tasks.map((task, i) => {
              const taskId = `w${currentWeek}-t${i}`;
              const done = completedTasks.has(taskId);
              return (
                <button
                  key={taskId}
                  onClick={() => toggleTask(taskId)}
                  className={`flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-all ${
                    done
                      ? "border-accent/30 bg-accent-soft"
                      : "border-border bg-bg hover:border-text-faint"
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    done ? "border-accent bg-accent" : "border-border"
                  }`}>
                    {done && (
                      <svg className="h-3 w-3 text-accent-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${done ? "text-text line-through" : "text-text-muted"}`}>
                    {task}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-text-faint">
            Sois régulier, c'est la constance qui compte. Les effets prennent
            du temps.
          </p>
        </Card>

        {/* Courbe d'évolution */}
        <Card>
          <h2 className="mb-4 text-[17px] font-semibold text-text">
            Ta courbe de densité
          </h2>
          {scans.length >= 2 ? (
            <TrendChart
              points={scans.map((scan) => ({
                score: scan.score,
                label: new Date(scan.created_at).toLocaleDateString("fr-FR", { month: "short" }),
              }))}
            />
          ) : (
            <p className="text-sm text-text-muted">
              Re-scanne dans {nextRescanDate
                ? Math.max(0, Math.ceil((nextRescanDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 30} jours pour voir ta courbe se tracer.
            </p>
          )}
        </Card>

        {/* Re-scan */}
        <Card>
          <h2 className="mb-2 text-[17px] font-semibold text-text">
            Re-scan mensuel
          </h2>
          <p className="text-sm text-text-muted mb-4">
            {nextRescanDate && nextRescanDate > new Date()
              ? `Prochain re-scan conseillé le ${nextRescanDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
              : "C'est le moment de refaire un scan pour mesurer ta progression."}
          </p>
          <Link href="/scan" onClick={() => trackEvent("rescan_started")}>
            <Button variant="primary" size="md" className="w-full">
              Faire mon re-scan
            </Button>
          </Link>
        </Card>

        {/* Historique */}
        {scans.length > 0 && (
          <Card>
            <h2 className="mb-3 text-[17px] font-semibold text-text">
              Historique
            </h2>
            <div className="space-y-2">
              {scans.slice().reverse().map((scan) => (
                <div key={scan.id} className="flex items-center justify-between rounded-[8px] border border-border bg-bg px-3 py-2">
                  <span className="text-sm text-text-muted">
                    {new Date(scan.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-data text-sm font-medium text-text">{scan.score}/100</span>
                    <Badge variant="accent">{scan.norwood}</Badge>
                    <button
                      onClick={async () => {
                        if (!confirm("Supprimer ce scan ?")) return;
                        const res = await fetch("/api/scan", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ scanId: scan.id }),
                        });
                        if (res.ok) setScans((prev) => prev.filter((s) => s.id !== scan.id));
                      }}
                      className="ml-1 text-text-faint hover:text-danger transition-colors"
                      title="Supprimer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Compte */}
        <Card>
          <h2 className="mb-3 text-[17px] font-semibold text-text">
            Mon compte
          </h2>
          <div className="flex items-center justify-between rounded-[8px] border border-border bg-bg px-3 py-2 mb-4">
            <span className="text-sm text-text-muted">Emails de suivi</span>
            <button
              onClick={async () => {
                const next = !marketingConsent;
                setMarketingConsent(next);
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase.from("profiles").update({ marketing_consent: next }).eq("id", user.id);
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                marketingConsent ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  marketingConsent ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Tu es sûr de vouloir supprimer ton compte ? Toutes tes données, photos et résultats seront supprimés définitivement.")) return;
              const res = await fetch("/api/account", { method: "DELETE" });
              if (res.ok) {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/";
              }
            }}
            className="text-sm text-danger hover:underline"
          >
            Supprimer mon compte et mes données
          </button>
          <p className="mt-2 text-xs text-text-faint">
            Suppression réelle et complète (données, photos, fichiers). Irréversible.
          </p>
        </Card>

        <Disclaimer className="justify-center" />
      </div>
    </main>
  );
}
