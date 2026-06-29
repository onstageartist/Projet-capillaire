import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation · Scalpy",
};

export default function CGU() {
  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12">
      <article className="w-full max-w-2xl space-y-8 text-sm leading-relaxed text-muted">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em] text-foreground">
          Conditions générales d'utilisation
        </h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            1. Objet
          </h2>
          <p>
            Les présentes conditions régissent l'utilisation du service Scalpy,
            accessible à l'adresse www.scalpy-app.com. En utilisant le
            service, tu acceptes ces conditions dans leur intégralité.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            2. Description du service
          </h2>
          <p>
            Scalpy propose une estimation de bien-être capillaire basée sur
            l'analyse visuelle par intelligence artificielle. Le service
            comprend : un scan capillaire (score de densité, stade Norwood,
            zones concernées), des recommandations de bien-être, et un suivi
            dans le temps.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            3. Avertissement médical
          </h2>
          <p className="font-medium text-foreground">
            Scalpy n'est pas un dispositif médical. Les résultats ne
            constituent pas un diagnostic, un avis médical, ni une prescription
            de traitement.
          </p>
          <p>
            L'utilisation du service ne remplace en aucun cas la consultation
            d'un dermatologue ou d'un professionnel de santé. En cas de doute
            sur ta santé capillaire, consulte un médecin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            4. Compte utilisateur
          </h2>
          <p>
            L'accès au scan nécessite la création d'un compte (email ou Google).
            Tu es responsable de la confidentialité de tes identifiants. Un
            premier scan est proposé gratuitement. Les fonctionnalités avancées
            (protocole complet, suivi avancé) font l'objet d'offres payantes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            5. Contenu envoyé
          </h2>
          <p>
            En envoyant une photo pour analyse, tu garantis en être l'auteur ou
            avoir les droits nécessaires. Tu conserves la propriété de tes
            photos. En utilisant le service, tu autorises Scalpy à transmettre
            ta photo à l'API d'Anthropic (Claude) pour le traitement de
            l'analyse.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            6. Limitation de responsabilité
          </h2>
          <p>
            Scalpy fournit un service « en l'état ». L'éditeur ne garantit pas
            l'exactitude, l'exhaustivité ou la fiabilité des résultats
            d'analyse. En aucun cas l'éditeur ne pourra être tenu responsable
            de décisions prises sur la base des résultats du service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            7. Propriété intellectuelle
          </h2>
          <p>
            L'ensemble du contenu du site (code, interface, textes, marque
            Scalpy) est protégé par le droit de la propriété intellectuelle.
            Toute reproduction ou utilisation non autorisée est interdite.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            8. Données personnelles
          </h2>
          <p>
            Le traitement des données personnelles est décrit dans notre{" "}
            <Link
              href="/confidentialite"
              className="text-accent hover:underline"
            >
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            9. Modification des CGU
          </h2>
          <p>
            Scalpy se réserve le droit de modifier ces conditions à tout
            moment. Les utilisateurs seront informés de toute modification
            substantielle. La poursuite de l'utilisation du service vaut
            acceptation des nouvelles conditions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            10. Droit applicable
          </h2>
          <p>
            Les présentes conditions sont soumises au droit français. Tout
            litige sera porté devant les tribunaux compétents de France.
          </p>
        </section>

        <p className="text-xs">Dernière mise à jour : juin 2026</p>

        <Link
          href="/"
          className="inline-block text-accent transition-colors hover:underline"
        >
          ← Retour à l'accueil
        </Link>
      </article>
    </main>
  );
}
