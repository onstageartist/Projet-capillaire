// ─────────────────────────────────────────────────────────────────────────────
// PROMPT DE LA PROJECTION AVANT / APRÈS (image IA)
//
// But du produit : montrer à l'utilisateur À QUOI POURRAIT RESSEMBLER SA TÊTE
// DANS ~90 JOURS en prenant soin de ses cheveux avec le plan Scalpy.
// Règle d'or : RÉALISTE MAIS MODESTE. Surtout PAS une greffe, PAS une
// restauration miracle, PAS un crâne entièrement regarni. Une amélioration
// crédible et atteignable, sinon la promesse devient mensongère (et illégale).
//
// On ne modifie QUE la zone des cheveux (masque d'inpainting). Le visage, la
// peau, l'angle, la lumière restent strictement identiques : c'est la même
// personne, quelques mois plus tard, en mieux — pas une autre photo.
//
// Pour ajuster l'intensité du rendu, voir docs/PROMPT-PROJECTION.md (guide en
// français). PROMPT_VERSION est tracé en base pour comparer les générations.
// ─────────────────────────────────────────────────────────────────────────────

export const PROMPT_VERSION = "projection-v2-inpaint";

// Prompt positif : ce qu'on VEUT. Insiste sur « même personne », « amélioration
// modeste et crédible quelques mois plus tard », « jamais une greffe ».
export const AFTER_PROMPT = `Photorealistic editorial close up portrait of the exact same man. Keep his face, skin tone, age, ethnicity, head shape, ears, expression, camera angle and lighting perfectly identical and untouched. Only modify the hair inside the masked scalp area. In the thinning and receding regions, render natural healthy hair that exactly matches his own hair color, texture, thickness and growth direction, with a realistic and believable increase in density and coverage. It must look like the same person a few months later after a modest natural improvement, never a hair transplant and never a full restoration. Preserve the original hairline shape, only slightly fuller and cleaner. Seamless natural blend with the existing hair at every edge, no visible border. Match the original lighting direction, contrast and facial symmetry exactly. Keep the natural skin texture, pores and the original phone photo look, do not smooth, retouch, beautify or airbrush the skin, keep realistic imperfections. Keep the change subtle and believable rather than dramatic. True to life photography, soft realistic lighting. No hat, no wig, no hairstyle change, no makeup change, no text, no logo, no watermark.`;

// Prompt négatif : ce qu'on REFUSE. Garde-fous contre le « faux/miracle » et les
// artefacts. Utilisé par les modèles qui le supportent.
export const NEGATIVE_PROMPT = `different person, changed face, distorted face, cartoon, illustration, 3d render, plastic skin, smoothed skin, airbrushed, beautified, glamour retouch, over polished, doll hair, fake wig, helmet hair, unrealistic full head of hair on a bald scalp, miraculous restoration, dense hair on a Norwood 6 crown, oversaturated, blurry, low quality, artifacts, extra ears, warped features, text, watermark, logo`;
