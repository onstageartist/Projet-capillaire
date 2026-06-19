import Link from "next/link";
import SocialProof from "@/components/social-proof";

const STEPS = [
  {
    num: "1",
    title: "Prends une photo",
    desc: "Dessus du crâne, lumière naturelle, 20 cm. 5 secondes.",
  },
  {
    num: "2",
    title: "L'IA analyse",
    desc: "Densité, zones clairsemées, stade Norwood — en 30 secondes.",
  },
  {
    num: "3",
    title: "Ton protocole",
    desc: "Des recommandations concrètes, adaptées à ta situation.",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "Score de densité",
    desc: "Un chiffre clair sur 100 pour savoir exactement où tu en es.",
  },
  {
    icon: "📊",
    title: "Stade Norwood",
    desc: "L'échelle utilisée par les dermatologues, estimée par IA.",
  },
  {
    icon: "🗺️",
    title: "Cartographie",
    desc: "Les zones à surveiller, affichées sur une carte visuelle.",
  },
  {
    icon: "💊",
    title: "Protocole perso",
    desc: "Des gestes concrets adaptés à ton type de perte.",
  },
  {
    icon: "📈",
    title: "Suivi mensuel",
    desc: "Compare tes scans et vois ta progression mois après mois.",
  },
  {
    icon: "🔒",
    title: "100 % privé",
    desc: "Tes photos restent sur ton compte. Personne d'autre n'y accède.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 pb-20 pt-24 sm:pt-32">
        <span className="mb-6 inline-block rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-medium text-accent">
          Analyse gratuite en 30 secondes
        </span>
        <h1 className="max-w-2xl text-center text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Scanne ton crâne,
          <br />
          <span className="text-accent">vois ta repousse.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-center text-lg leading-relaxed text-muted">
          Score de densité, stade Norwood, zones à surveiller et protocole
          personnalisé — depuis ton téléphone, en quelques secondes.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/scan"
            className="rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-background shadow-[0_0_32px_rgba(52,211,153,0.15)] transition-all hover:bg-accent-hover hover:shadow-[0_0_48px_rgba(52,211,153,0.25)]"
          >
            Faire mon scan gratuit
          </Link>
          <Link
            href="/plus"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Voir les offres →
          </Link>
        </div>
        <div className="mt-8">
          <SocialProof />
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="border-t border-border bg-surface/50 px-5 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Comment ça marche
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-muted">
            Trois étapes, zéro prise de tête.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
                  {step.num}
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Tout ce que tu obtiens
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-muted">
            Un bilan complet, pas juste un chiffre.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/30"
              >
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="border-t border-border bg-surface/50 px-5 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Ils ont testé
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-muted">
            Des hommes comme toi qui ont voulu savoir.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              {
                name: "Marc, 28 ans",
                text: "Je repoussais le moment d'aller chez le dermato. Scalpy m'a donné une première réponse en 30 secondes — ça m'a motivé à agir.",
              },
              {
                name: "Thomas, 34 ans",
                text: "Le score de densité m'a rassuré : je pensais que c'était pire. Maintenant je fais un scan par mois pour suivre.",
              },
              {
                name: "Alex, 41 ans",
                text: "Simple, rapide, pas de jugement. Les recommandations étaient concrètes, pas du blabla générique.",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-border bg-background p-5"
              >
                <p className="text-sm leading-relaxed text-muted">
                  &ldquo;{t.text}&rdquo;
                </p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reassurance */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Pourquoi Scalpy ?
          </h2>
          <div className="mt-10 space-y-6 text-left">
            <div className="flex gap-4">
              <span className="mt-1 shrink-0 text-accent">✓</span>
              <div>
                <p className="font-medium text-foreground">
                  Résultat en 30 secondes
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Pas de rendez-vous, pas d'attente. Tu as ta réponse
                  immédiatement.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="mt-1 shrink-0 text-accent">✓</span>
              <div>
                <p className="font-medium text-foreground">
                  IA entraînée sur la calvitie masculine
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  L'analyse se base sur l'échelle Norwood, utilisée en
                  dermatologie.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="mt-1 shrink-0 text-accent">✓</span>
              <div>
                <p className="font-medium text-foreground">
                  Premier scan 100 % gratuit
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Pas de carte bancaire, pas d'engagement. Tu testes, tu vois.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-surface/50 px-5 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                q: "Est-ce que Scalpy remplace un dermatologue ?",
                a: "Non. Scalpy donne une estimation de bien-être basée sur l'IA. C'est un point de départ, pas un diagnostic. On te recommandera toujours de consulter un professionnel.",
              },
              {
                q: "Le scan est vraiment gratuit ?",
                a: "Oui, ton premier scan est 100 % gratuit, sans carte bancaire. Les offres Plus et Pro débloquent le protocole complet et le suivi avancé.",
              },
              {
                q: "Mes photos sont-elles confidentielles ?",
                a: "Totalement. Tes photos sont stockées dans ton espace personnel sécurisé. Elles ne sont ni partagées, ni vendues, ni utilisées à d'autres fins.",
              },
              {
                q: "Comment fonctionne l'analyse ?",
                a: "Tu prends une photo du dessus de ton crâne. Notre IA analyse la densité capillaire, estime ton stade Norwood et identifie les zones clairsemées — le tout en 30 secondes.",
              },
              {
                q: "À quelle fréquence dois-je scanner ?",
                a: "Une fois par mois suffit. C'est le bon rythme pour voir une évolution sans te stresser.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-border bg-background"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-foreground">
                  {faq.q}
                  <span className="ml-4 shrink-0 text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Prêt à savoir où tu en es ?
          </h2>
          <p className="mt-4 text-muted">
            Plus tôt tu sais, plus tôt tu agis. Et c'est là que ça se joue.
          </p>
          <Link
            href="/scan"
            className="mt-8 inline-block rounded-xl bg-accent px-10 py-4 text-lg font-semibold text-background shadow-[0_0_32px_rgba(52,211,153,0.15)] transition-all hover:bg-accent-hover hover:shadow-[0_0_48px_rgba(52,211,153,0.25)]"
          >
            Faire mon scan gratuit
          </Link>
          <p className="mt-4 text-xs text-muted">
            30 secondes. Gratuit. Confidentiel.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted">
            Scalpy — Estimation de bien-être, pas un avis médical.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-muted">
            <Link href="/plus" className="transition-colors hover:text-foreground">
              Offres
            </Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="transition-colors hover:text-foreground">
              Confidentialité
            </Link>
            <Link href="/cgu" className="transition-colors hover:text-foreground">
              CGU
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
