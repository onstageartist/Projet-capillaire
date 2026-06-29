# L'image "avant / après" générée par l'IA — comment ça marche et comment la régler

> Ce document explique **en clair** la photo "objectif" que Scalpy génère après le
> scan : son but, comment elle est fabriquée, et les boutons pour l'ajuster.
> Le prompt technique vit dans `lib/projection-prompt.ts`. La logique de génération
> vit dans `app/api/projection/route.ts`.

## 1. Le but (à ne jamais perdre de vue)

Montrer à la personne **à quoi pourrait ressembler sa tête dans ~90 jours** en
prenant soin de ses cheveux avec le plan Scalpy.

La règle d'or : **réaliste mais MODESTE.**
- ✅ Une amélioration crédible et atteignable (un peu plus dense, plus net).
- ❌ JAMAIS une greffe, un crâne entièrement regarni, une "restauration miracle".

Pourquoi ? Parce que promettre un résultat irréaliste, c'est mentir au client
(et juridiquement risqué). Le badge **"Objectif visuel, simulation, pas un
résultat promis"** est affiché en permanence sur l'image pour cette raison.

## 2. Comment l'image est fabriquée

1. Pendant le scan, le téléphone détecte la zone des **cheveux** (masque).
2. On envoie à l'IA : ta **photo portrait** + ce **masque** + le prompt.
3. L'IA **ne repeint QUE la zone des cheveux**. Le visage, la peau, l'angle et la
   lumière restent **strictement identiques** → c'est la même personne, quelques
   mois plus tard, en mieux. Pas une autre photo.
4. Résultat aligné au pixel avec l'avant → la barre de comparaison glisse parfaitement.

**Garde-fou intégré :** pour les stades très avancés (Norwood VI / VII), on ne
génère pas un faux résultat dense (ce serait non crédible).

## 3. Les 3 fournisseurs (repli automatique)

Pour ne jamais rester bloqué, on essaie dans l'ordre :
1. **FLUX.1 Fill** (inpainting au masque) — la voie propre et précise.
2. **Gemini 2 Flash** (édition pleine image) — si pas de masque.
3. **GPT Image** — dernier filet.

## 4. Les boutons pour régler le rendu

Tout est dans `app/api/projection/route.ts`, appel FLUX :

| Réglage | Valeur actuelle | Effet si on augmente |
|---|---|---|
| `num_inference_steps` | 30 | Plus de détail capillaire, mais plus lent/cher (plafonne vite). |
| `guidance_scale` | 3.5 | Colle plus au prompt ; **au-delà de ~4 les mèches deviennent "plastique"**. |

Et le **texte du prompt** (`lib/projection-prompt.ts`) :
- `AFTER_PROMPT` = ce qu'on VEUT (insiste sur "même personne", "modeste", "jamais une greffe").
- `NEGATIVE_PROMPT` = ce qu'on REFUSE (faux cheveux, casque, peau plastique, miracle…).

**Pour rendre le résultat encore plus subtil :** renforcer dans `AFTER_PROMPT`
les mots "subtle", "modest", "barely fuller", baisser légèrement `guidance_scale`.
**Pour un peu plus de densité :** assouplir "subtle", monter `num_inference_steps`.

> ⚠️ Toujours tester sur plusieurs vrais visages après un changement, et garder
> `PROMPT_VERSION` à jour (il est tracé en base pour comparer les versions).
