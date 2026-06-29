import { Reveal } from "@/components/ui";

const CARDS: { title: string; desc: string; icon: React.ReactNode }[] = [
  {
    title: "Tes photos restent privées",
    desc: "Hébergées en Europe, chiffrées, jamais partagées ni revendues. Elles ne servent qu'à ton bilan.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />,
  },
  {
    title: "Tu gardes le contrôle",
    desc: "Tu peux supprimer un scan ou ton compte entier quand tu veux. La suppression est réelle et complète.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  },
  {
    title: "Gratuit pour commencer",
    desc: "Ton scan, ton score et l'aperçu de ton objectif sont gratuits, sans carte bancaire. Tu décides ensuite.",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />,
  },
];

export function Reassurance() {
  return (
    <section className="border-y border-border bg-surface px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-data text-xs uppercase tracking-[0.2em] text-accent">Ta confidentialité d'abord</p>
          <h2 className="mt-3 font-display t-h2 text-balance font-semibold text-text">
            Un sujet intime, traité avec sérieux
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-text-muted">
            Tes photos sont sensibles. On les protège comme telles, et tu restes maître de tes données du début à la fin.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 90} className="rounded-[var(--radius-lg)] border border-border bg-bg p-6 shadow-card">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">{c.icon}</svg>
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-text">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{c.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
