import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Faire mon scan", href: "/onboarding" },
      { label: "Comment ça marche", href: "/#comment" },
      { label: "Offres", href: "/plus" },
      { label: "Mon suivi", href: "/suivi" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Le journal Scalpy", href: "/blog" },
      { label: "Comprendre son cuir chevelu", href: "/blog/comprendre-son-cuir-chevelu" },
      { label: "Routine capillaire simple", href: "/blog/routine-capillaire-simple" },
      { label: "Questions fréquentes", href: "/#faq" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "Notre méthode", href: "/blog/notre-methode" },
      { label: "Notre charte bien-être", href: "/blog/charte-bien-etre" },
      { label: "Contact", href: "mailto:mathias.stephant@gmail.com" },
    ],
  },
  {
    title: "Confiance et légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "Conditions d'utilisation", href: "/cgu" },
      { label: "Avertissement bien-être", href: "/blog/charte-bien-etre" },
    ],
  },
];

const TRUST = [
  "Données hébergées en Europe",
  "Sans carte pour commencer",
  "Bien-être, pas un avis médical",
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      {/* Bande CTA finale */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-xl font-semibold tracking-[-0.01em] text-text">
              Prêt à savoir où tu en es ?
            </p>
            <p className="mt-1 text-sm text-text-muted">Une photo, 30 secondes. Gratuit, sans carte.</p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-accent px-7 py-3.5 font-semibold text-accent-foreground shadow-card transition-all duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            Faire mon scan gratuit
          </Link>
        </div>
      </div>

      {/* Colonnes */}
      <div className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          {/* Marque */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5 text-text">
              <svg width="26" height="26" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                <circle cx="28" cy="28" r="22" stroke="var(--accent)" strokeOpacity=".3" />
                <circle cx="28" cy="28" r="14" stroke="var(--accent)" strokeOpacity=".5" />
                <g stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"><path d="M28 4 V10 M28 46 V52 M4 28 H10 M46 28 H52" /></g>
                <circle cx="28" cy="28" r="3.6" fill="var(--accent)" />
              </svg>
              <span className="font-display text-lg font-semibold tracking-[-0.02em]">Scalpy</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
              Mesure ta densité capillaire en une photo, situe tes zones et suis ton évolution mois après mois.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-text-muted transition-colors hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Badges de confiance */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-8">
          {TRUST.map((t) => (
            <span key={t} className="flex items-center gap-2 text-xs text-text-muted">
              <svg className="h-3.5 w-3.5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Barre basse */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 text-xs text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Scalpy. Tous droits réservés.</p>
          <p className="max-w-xl sm:text-right">
            Scalpy est un outil de bien-être. Il ne fournit pas d'avis médical et ne remplace pas un professionnel de santé. Le score est une estimation, la projection une simulation.
          </p>
        </div>
      </div>
    </footer>
  );
}
