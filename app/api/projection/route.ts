import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEventServer } from "@/lib/track-server";
// Prompts centralisés et documentés (voir lib/projection-prompt.ts + docs/PROMPT-PROJECTION.md).
import { AFTER_PROMPT, NEGATIVE_PROMPT, PROMPT_VERSION } from "@/lib/projection-prompt";

// Garde anti-abus : max de generations par utilisateur sur une fenetre.
// L'idempotence par scanId evite deja les doublons ; ceci borne le cout global.
const RATE_MAX = 12;
const RATE_WINDOW = 60 * 60 * 1000; // 1 h
const rateMap = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (rateMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW);
  if (recent.length >= RATE_MAX) { rateMap.set(userId, recent); return true; }
  recent.push(now);
  rateMap.set(userId, recent);
  return false;
}

// Appel externe borné dans le temps : un fournisseur lent ne bloque jamais la
// requête indéfiniment (libère la fonction serverless).
async function fetchTimeout(url: string, init: RequestInit, ms = 45_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function storeResult(admin: ReturnType<typeof createAdminClient>, userId: string, scanId: string, buffer: Buffer) {
  await admin.storage.from("projections").upload(`${userId}/${scanId}/full.jpg`, buffer, { contentType: "image/jpeg", upsert: true });
  // Teaser VOLONTAIREMENT dégradé (réduit + fortement flouté) : même récupéré
  // en direct via son URL, il ne révèle pas le résultat net. La version nette
  // (full.jpg) n'est servie qu'aux abonnés (cf. page résultat).
  let teaser = buffer;
  try {
    teaser = await sharp(buffer).resize(420).blur(16).jpeg({ quality: 38 }).toBuffer();
  } catch { teaser = buffer; }
  await admin.storage.from("projections").upload(`${userId}/${scanId}/teaser.jpg`, teaser, { contentType: "image/jpeg", upsert: true });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { scanId, photoPath, beforeImage, maskImage } = await req.json();
    if (!scanId) return NextResponse.json({ error: "scanId requis" }, { status: 400 });

    if (rateLimited(user.id)) {
      return NextResponse.json({ ok: false, status: "rate_limited" }, { status: 429 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("projections")
      .select("id, status")
      .eq("scan_id", scanId)
      .eq("user_id", user.id)
      .single();

    if (existing && existing.status === "done") {
      return NextResponse.json({ ok: true, status: "already_done" });
    }

    const projectionId = existing?.id || crypto.randomUUID();
    if (!existing) {
      await admin.from("projections").insert({
        id: projectionId, user_id: user.id, scan_id: scanId,
        status: "generating", provider: "flux-fill", prompt_version: PROMPT_VERSION,
      });
    } else {
      await admin.from("projections").update({ status: "generating" }).eq("id", projectionId);
    }

    await trackEventServer("projection_started", {}, { userId: user.id });

    // Stocke l'avant (prise portrait) cote serveur, pour que la page resultat ET
    // l'espace abonne montrent le MEME avant, aligne au pixel avec l'apres.
    if (beforeImage && typeof beforeImage === "string" && beforeImage.startsWith("data:")) {
      try {
        const b = Buffer.from(beforeImage.split(",")[1] || "", "base64");
        if (b.length > 0) {
          await admin.storage.from("projections").upload(`${user.id}/${scanId}/before.jpg`, b, { contentType: "image/jpeg", upsert: true });
        }
      } catch { /* non bloquant */ }
    }

    const falKey = process.env.FAL_KEY;
    let success = false;

    // ---- 1) Inpainting au masque (FLUX.1 Fill) : la voie propre ----
    // beforeImage et maskImage sont des data URLs, memes dimensions, donc l'apres
    // s'aligne au pixel avec l'avant. On ne touche qu'a la zone masquee (cheveux).
    if (falKey && beforeImage && maskImage) {
      try {
        const falRes = await fetchTimeout("https://fal.run/fal-ai/flux-pro/v1/fill", {
          method: "POST",
          headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: beforeImage,
            mask_url: maskImage,
            prompt: AFTER_PROMPT,
            num_images: 1,
            num_inference_steps: 30, // le detail capillaire plafonne au-dela, inutile de payer plus
            guidance_scale: 3.5, // 3 a 4 : au-dela les meches deviennent plastiques
            output_format: "png", // evite les artefacts JPEG sur la zone recollee
            safety_tolerance: "2",
          }),
        });
        if (falRes.ok) {
          const data = await falRes.json();
          const url = data.images?.[0]?.url || data.image?.url;
          if (url) {
            const imgBuf = await (await fetch(url)).arrayBuffer();
            await storeResult(admin, user.id, scanId, Buffer.from(imgBuf));
            await admin.from("projections").update({
              status: "done", provider: "flux-fill",
              teaser_path: `${user.id}/${scanId}/teaser.jpg`,
              full_path: `${user.id}/${scanId}/full.jpg`,
            }).eq("id", projectionId);
            success = true;
          }
        }
      } catch { /* repli ci-dessous */ }
    }

    // ---- Repli : edition d'image pleine (l'ancienne methode), si pas de masque ----
    if (!success && falKey) {
      try {
        let imageUrl = beforeImage as string | undefined;
        if (!imageUrl && photoPath) {
          const { data: photoData } = await admin.storage.from("scalp-photos").download(photoPath);
          if (photoData) {
            const b64 = Buffer.from(await photoData.arrayBuffer()).toString("base64");
            imageUrl = `data:image/jpeg;base64,${b64}`;
          }
        }
        if (imageUrl) {
          const falRes = await fetchTimeout("https://fal.run/fal-ai/gemini-2-flash/image", {
            method: "POST",
            headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: AFTER_PROMPT, image_url: imageUrl }),
          });
          if (falRes.ok) {
            const data = await falRes.json();
            const url = data.images?.[0]?.url || data.image?.url;
            if (url) {
              const imgBuf = await (await fetch(url)).arrayBuffer();
              await storeResult(admin, user.id, scanId, Buffer.from(imgBuf));
              await admin.from("projections").update({
                status: "done", provider: "gemini-full",
                teaser_path: `${user.id}/${scanId}/teaser.jpg`,
                full_path: `${user.id}/${scanId}/full.jpg`,
              }).eq("id", projectionId);
              success = true;
            }
          }
        }
      } catch { /* repli openai */ }
    }

    // ---- Repli final : GPT Image Edit ----
    if (!success && process.env.OPENAI_API_KEY) {
      try {
        let b64Src = "";
        if (beforeImage && typeof beforeImage === "string") {
          b64Src = beforeImage;
        } else if (photoPath) {
          const { data: photoData } = await admin.storage.from("scalp-photos").download(photoPath);
          if (photoData) b64Src = `data:image/jpeg;base64,${Buffer.from(await photoData.arrayBuffer()).toString("base64")}`;
        }
        if (b64Src) {
          const openaiRes = await fetchTimeout("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-image-1", prompt: AFTER_PROMPT, image: b64Src }),
          });
          if (openaiRes.ok) {
            const data = await openaiRes.json();
            const b64 = data.data?.[0]?.b64_json;
            if (b64) {
              await storeResult(admin, user.id, scanId, Buffer.from(b64, "base64"));
              await admin.from("projections").update({
                status: "done", provider: "gpt-image",
                teaser_path: `${user.id}/${scanId}/teaser.jpg`,
                full_path: `${user.id}/${scanId}/full.jpg`,
              }).eq("id", projectionId);
              success = true;
            }
          }
        }
      } catch { /* echec gere ci-dessous */ }
    }

    if (!success) {
      await admin.from("projections").update({ status: "failed" }).eq("id", projectionId);
      await trackEventServer("projection_failed", {}, { userId: user.id });
      return NextResponse.json({ ok: false, status: "failed" });
    }

    await trackEventServer("projection_completed", {}, { userId: user.id });
    return NextResponse.json({ ok: true, status: "done" });
  } catch (e) {
    console.error("Projection error:", e);
    return NextResponse.json({ error: "Erreur de projection" }, { status: 500 });
  }
}

// Le suffixe NEGATIVE_PROMPT est garde pour les modeles qui le supportent.
void NEGATIVE_PROMPT;
