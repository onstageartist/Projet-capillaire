import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/lib/blog";
import SiteFooter from "@/components/site-footer";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article introuvable · Scalpy" };
  return {
    title: `${article.title} · Scalpy`,
    description: article.description,
    openGraph: { title: article.title, description: article.description, type: "article" },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const others = ARTICLES.filter((a) => a.slug !== slug).slice(0, 2);

  return (
    <main className="flex flex-1 flex-col">
      <article className="mx-auto w-full max-w-2xl px-5 py-14 sm:py-20">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-accent">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Le journal
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span className="font-data text-xs uppercase tracking-wider text-accent">{article.category}</span>
          <span className="text-xs text-text-faint">{article.readingMinutes} min de lecture</span>
        </div>

        <h1 className="mt-3 font-display text-balance text-[clamp(1.75rem,1.2rem+2.4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-text">
          {article.title}
        </h1>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-text-muted">{article.description}</p>

        <div className="mt-10 space-y-10">
          {article.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-text">{s.heading}</h2>
              <div className="mt-3 space-y-4">
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-pretty leading-[1.7] text-text-muted">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Encart bien-etre */}
        <div className="mt-12 rounded-[var(--radius-lg)] border border-border bg-surface-2 p-5 text-sm leading-relaxed text-text-muted">
          Scalpy est un outil de bien-être. Il situe ta densité, tes zones et ton stade à partir d'une photo. C'est une estimation, pas un avis médical, et la projection est une simulation.
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-accent/30 bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-semibold text-text">Situe où en sont tes cheveux</p>
          <Link href="/onboarding" className="inline-flex shrink-0 items-center rounded-[var(--radius-lg)] bg-accent px-6 py-3 font-semibold text-accent-foreground transition-all duration-[var(--dur)] ease-[var(--ease-out)] hover:bg-accent-hover">
            Faire mon scan gratuit
          </Link>
        </div>

        {/* A lire aussi */}
        <div className="mt-14 border-t border-border pt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">À lire aussi</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/blog/${o.slug}`} className="group rounded-[var(--radius-md)] border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                <span className="font-data text-xs uppercase tracking-wider text-accent">{o.category}</span>
                <p className="mt-1.5 font-medium leading-snug text-text">{o.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
