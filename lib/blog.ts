export interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingMinutes: number;
  sections: { heading: string; paragraphs: string[] }[];
}

export const ARTICLES: Article[] = [
  {
    slug: "comprendre-son-cuir-chevelu",
    title: "Comprendre la santé de son cuir chevelu",
    description: "Un repère clair pour situer où en sont tes cheveux, sans panique et sans jargon. Densité, zones, stade et bien-être au quotidien.",
    category: "Le guide",
    readingMinutes: 6,
    sections: [
      {
        heading: "Pourquoi on regarde toujours au mauvais endroit",
        paragraphs: [
          "Devant le miroir, on juge ses cheveux à l'instinct. La lumière, l'angle et l'humeur du jour changent tout. Résultat, on alterne entre la panique et le déni, sans jamais savoir où on en est vraiment.",
          "Comprendre son cuir chevelu, c'est d'abord remplacer l'impression par un repère stable. Trois éléments suffisent pour se situer : la densité, les zones, et le stade.",
        ],
      },
      {
        heading: "La densité, ton chiffre repère",
        paragraphs: [
          "La densité décrit la quantité de cheveux sur une surface donnée. C'est elle qui donne l'impression de matière et de couverture. La suivre dans le temps vaut bien plus qu'un instantané, car c'est la tendance qui compte, pas la photo d'un seul jour.",
          "Chez Scalpy, on traduit cette observation en un score de densité sur 100. C'est une estimation de bien-être, pas un avis médical, mais elle te donne un point de départ concret pour te comparer à toi-même au fil des mois.",
        ],
      },
      {
        heading: "Les zones, parce que tout ne bouge pas pareil",
        paragraphs: [
          "Le cuir chevelu n'est pas uniforme. Les golfes à l'avant, la couronne sur le sommet, la ligne frontale, chaque zone évolue à son rythme. Regarder zone par zone évite de tout dramatiser ou de tout minimiser.",
          "Repérer tes zones, c'est savoir où porter ton attention et quels gestes simples adopter en priorité.",
        ],
      },
      {
        heading: "Le bien-être, le levier que tu contrôles",
        paragraphs: [
          "Le sommeil, le stress, l'alimentation et le soin du cuir chevelu font partie du quotidien que tu maîtrises. Aucun de ces leviers ne promet de miracle, mais pris ensemble et avec régularité, ils soutiennent un cuir chevelu en forme.",
          "L'idée n'est pas de tout changer d'un coup. C'est de poser un repère clair, puis d'avancer avec un plan simple et un suivi qui prouve par la courbe.",
        ],
      },
    ],
  },
  {
    slug: "routine-capillaire-simple",
    title: "Une routine capillaire simple qui tient dans le temps",
    description: "La régularité bat l'intensité. Voici une routine minimaliste de bien-être capillaire, facile à garder semaine après semaine.",
    category: "Routine",
    readingMinutes: 5,
    sections: [
      {
        heading: "Le piège de la routine trop ambitieuse",
        paragraphs: [
          "On démarre souvent fort, avec dix produits et un protocole de pro. Au bout de deux semaines, tout tombe à l'eau. La routine qui marche est celle que tu gardes, pas celle qui impressionne.",
          "Mieux vaut trois gestes tenus pendant des mois que dix gestes abandonnés en quinze jours.",
        ],
      },
      {
        heading: "Le soin du cuir chevelu d'abord",
        paragraphs: [
          "Un shampoing doux, un séchage sans excès de chaleur, et un massage léger du cuir chevelu de deux minutes. Ces gestes simples apaisent et entretiennent un terrain sain, sans agresser.",
          "Le massage n'est pas magique, mais il est agréable, gratuit, et il t'aide à garder le contact avec l'état de ton cuir chevelu.",
        ],
      },
      {
        heading: "L'hygiène de vie en soutien",
        paragraphs: [
          "Un sommeil régulier, une assiette équilibrée et une gestion du stress soutiennent le bien-être général, cheveux compris. Rien de spectaculaire, tout de durable.",
          "Note ce que tu changes, et garde le cap. La constance est le vrai actif de toute routine.",
        ],
      },
      {
        heading: "Mesurer pour rester motivé",
        paragraphs: [
          "Sans repère, on lâche. Un suivi mensuel de ta densité te montre si tu avances, et c'est cette preuve par la courbe qui entretient la motivation sur la durée.",
        ],
      },
    ],
  },
  {
    slug: "stress-et-cuir-chevelu",
    title: "Stress et cuir chevelu, le lien souvent ignoré",
    description: "Le stress fait partie de l'équation bien-être. Comprendre son rôle, sans dramatiser, pour mieux prendre soin de soi.",
    category: "Bien-être",
    readingMinutes: 4,
    sections: [
      {
        heading: "Le stress, un facteur parmi d'autres",
        paragraphs: [
          "Le stress chronique pèse sur l'ensemble de l'organisme. Il n'explique pas tout, mais il fait partie des leviers de bien-être à ne pas négliger quand on prend soin de ses cheveux.",
          "L'objectif n'est pas de supprimer le stress, c'est impossible, mais de lui laisser moins de place au quotidien.",
        ],
      },
      {
        heading: "Des gestes simples et tenables",
        paragraphs: [
          "Quelques minutes de respiration calme avant de dormir, une activité physique régulière, et un rythme de sommeil stable. Ces habitudes soutiennent ton équilibre global.",
          "Comme pour le reste, c'est la régularité qui compte, pas l'intensité d'un jour.",
        ],
      },
      {
        heading: "Garder un repère objectif",
        paragraphs: [
          "Quand on agit sur son hygiène de vie, on aime voir si ça se traduit. Un suivi régulier de ta densité te donne ce repère, mois après mois.",
        ],
      },
    ],
  },
  {
    slug: "notre-methode",
    title: "Notre méthode chez Scalpy",
    description: "Comment Scalpy situe ta densité, tes zones et ton stade à partir d'une photo, et pourquoi on reste dans un cadre de bien-être.",
    category: "Scalpy",
    readingMinutes: 4,
    sections: [
      {
        heading: "Une mesure stable, pas une impression",
        paragraphs: [
          "Scalpy part d'une photo de ton crâne et en tire une lecture visuelle. On en déduit un score de densité sur 100, ton stade estimé et tes zones concernées. C'est une estimation de bien-être, conçue pour te comparer à toi-même dans le temps.",
          "L'intérêt n'est pas le chiffre d'un jour, mais la trajectoire que tu construis scan après scan.",
        ],
      },
      {
        heading: "Un objectif visuel, jamais une promesse",
        paragraphs: [
          "On te montre aussi un aperçu de ton objectif, une simulation sur ta propre photo. C'est un repère visuel pour savoir vers quoi tu peux tendre, présenté comme une simulation, jamais comme un résultat promis.",
          "Cette honnêteté est volontaire. Dans un secteur plein de promesses, la clarté est ce qui mérite la confiance.",
        ],
      },
      {
        heading: "Le cadre, clair et assumé",
        paragraphs: [
          "Scalpy est un outil de bien-être. Il ne fournit pas d'avis médical et ne remplace pas un professionnel de santé. On situe, on estime, on suit. Rien de plus, mais rien de flou.",
        ],
      },
    ],
  },
  {
    slug: "charte-bien-etre",
    title: "Notre charte bien-être",
    description: "Nos engagements de clarté et d'honnêteté. Ce que Scalpy fait, ce qu'il ne fait pas, et pourquoi.",
    category: "Scalpy",
    readingMinutes: 3,
    sections: [
      {
        heading: "Ce que Scalpy fait",
        paragraphs: [
          "On situe ta densité, tes zones et ton stade à partir d'une photo. On te propose un plan de gestes simples et un suivi mensuel pour observer ton évolution.",
          "Tout est pensé pour te faire passer d'une impression floue à un repère clair.",
        ],
      },
      {
        heading: "Ce que Scalpy ne fait pas",
        paragraphs: [
          "Scalpy ne pose pas d'avis médical et ne remplace pas un professionnel de santé. Le score est une estimation, la projection une simulation. On ne promet aucun résultat.",
          "Pour toute préoccupation sur ta santé, parles-en à un professionnel.",
        ],
      },
      {
        heading: "Tes données t'appartiennent",
        paragraphs: [
          "Tes photos restent privées, hébergées en Europe, et tu peux les supprimer quand tu veux. La confiance commence par le respect de tes données.",
        ],
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
