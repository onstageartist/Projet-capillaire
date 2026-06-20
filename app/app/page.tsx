"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import { Button, Card, Gauge, ProgressBar, Badge, Disclaimer } from "@/components/ui";

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

const PROGRAM_WEEKS = [
  { week: 1, pillar: "Soin du cuir chevelu", tasks: ["Shampoing doux sans sulfate", "Séchage naturel (pas de chaleur)", "Massage léger du cuir chevelu 2 min"] },
  { week: 2, pillar: "Nutrition", tasks: ["Ajouter des protéines à chaque repas", "Un aliment riche en zinc par jour", "Boire 1,5L d'eau minimum"] },
  { week: 3, pillar: "Sommeil et stress", tasks: ["Se coucher à heure régulière", "5 min de respiration avant de dormir", "30 min d'activité physique"] },
  { week: 4, pillar: "Routine consolidée", tasks: ["Continuer le shampoing doux", "Taie d'oreiller en satin/soie", "Éviter les coiffures trop serrées"] },
];

export default function AppPage() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [taskDates, setTaskDates] = useState<Map<string, string>>(new Map());
  const [currentDay, setCurrentDay] = useState(1);
  const [projection, setProjection] = useState<ProjectionData>({ originalUrl: null, fullUrl: null });
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

          const { data: scanRow } = await supabase
            .from("scans")
            .select("photo_path")
            .eq("id", latestScan.id)
            .single();

          let origUrl = null;
          if (scanRow?.photo_path) {
            const { data: oUrl } = await supabase.storage
              .from("scalp-photos")
              .createSignedUrl(scanRow.photo_path, 3600);
            origUrl = oUrl?.signedUrl ?? null;
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
      <main className="flex flex-1 flex-col items-center justify-center">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      </main>
    );
  }

  const currentWeek = Math.min(Math.ceil(currentDay / 7), 4);
  const weekData = PROGRAM_WEEKS[currentWeek - 1];
  const totalTasks = PROGRAM_WEEKS.reduce((acc, w) => acc + w.tasks.length, 0);
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
          <h1 className="text-[26px] font-bold text-text">Ton espace</h1>
          <p className="text-sm text-text-muted">
            Jour {currentDay}/30 — Semaine {currentWeek}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-[20px] font-bold text-accent">{progressPercent}%</p>
            <p className="text-xs text-text-faint">Programme</p>
          </Card>
          <Card className="text-center">
            <p className="text-[20px] font-bold text-text">{streak}</p>
            <p className="text-xs text-text-faint">Série</p>
          </Card>
          <Card className="text-center">
            <p className="text-[20px] font-bold text-text">{scans.length}</p>
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
              Simulation — objectif visuel, pas une prédiction
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
                      <svg className="h-3 w-3 text-[#06231A]" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
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
            Évolution du score
          </h2>
          {scans.length >= 2 ? (
            <div className="flex items-end gap-2 h-32">
              {scans.map((scan, i) => (
                <div key={scan.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-text-faint">{scan.score}</span>
                  <div
                    className="w-full rounded-t-[8px] bg-accent transition-all"
                    style={{ height: `${(scan.score / 100) * 100}%` }}
                  />
                  <span className="text-[10px] text-text-faint">
                    {new Date(scan.created_at).toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Fais ton premier re-scan dans {nextRescanDate
                ? Math.max(0, Math.ceil((nextRescanDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 30} jours pour voir ta courbe apparaitre.
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
                    <span className="text-sm font-semibold text-text">{scan.score}/100</span>
                    <Badge variant="accent">{scan.norwood}</Badge>
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
