import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/blog";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Le journal Scalpy · Bien-être capillaire",
  description: "Des repères clairs et honnêtes pour comprendre ton cuir chevelu, ta densité et ta routine. Cadre bien-être, jamais médical.",
};

export default function BlogIndex() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-accent">Le journal</p>
        <h1 className="mt-3 font-display text-balance text-[clamp(1.75rem,1.2rem+2.2vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-text">
          Comprendre tes cheveux, sans jargon ni promesse
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-text-muted">
          Des repères clairs pour situer où tu en es et avancer avec des gestes simples. Cadre bien-être, toujours honnête.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-card transition-all duration-[var(--dur)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
            >
              <span className="font-data text-xs uppercase tracking-wider text-accent">{a.category}</span>
              <h2 className="mt-3 text-balance text-lg font-semibold leading-snug text-text">{a.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{a.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Lire
                <svg className="h-4 w-4 transition-transform duration-[var(--dur)] ease-[var(--ease-out)] group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
