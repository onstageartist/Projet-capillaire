import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <h1 className="text-center text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
        Scanne ton crâne,
        <br />
        <span className="text-accent">vois ta repousse.</span>
      </h1>
      <p className="mt-6 max-w-md text-center text-lg text-muted">
        Score de densité, stade Norwood, protocole personnalisé — en quelques
        secondes, depuis ton téléphone.
      </p>
      <Link
        href="/scan"
        className="mt-8 rounded-lg bg-accent px-8 py-3.5 text-lg font-medium text-background transition-colors hover:bg-accent-hover"
      >
        Faire mon scan gratuit
      </Link>
    </main>
  );
}
