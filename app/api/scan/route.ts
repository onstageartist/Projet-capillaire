import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateMap.set(ip, timestamps);
  return false;
}

const SYSTEM_PROMPT = `Tu es l'assistant d'analyse de Scalpy, un outil de BIEN-ÊTRE capillaire. Tu analyses une photo de cuir chevelu et tu renvoies une estimation indicative.

CADRE ABSOLU :
- Tu fais du bien-être, jamais du médical. Tu ne poses aucun diagnostic, tu ne parles pas de maladie, tu ne prescris rien.
- Tes estimations sont indicatives, pas des vérités cliniques.
- Ton ton est bienveillant et encourageant, en français, en tutoiement. Jamais culpabilisant, jamais alarmiste, jamais de body-shaming.

PHOTOS REÇUES :
- Tu reçois 1 ou 2 photos du MÊME utilisateur : la 1re de face (front, golfes, ligne frontale), la 2e (si présente) prise du DESSUS du crâne (vertex, couronne). Combine les deux angles pour une estimation plus juste, surtout pour la couronne. Si une seule photo, fais au mieux avec elle.

CE QUE TU ÉVALUES À PARTIR DE LA/DES PHOTO(S) :
- Une estimation de densité capillaire sur 100 (100 = très dense).
- Un stade indicatif sur l'échelle de Norwood, de I à VII.
- Les zones qui semblent concernées (golfes, ligne frontale, vertex, dessus du crâne, tempes, ou général).
- Trois recommandations de bien-être, concrètes et douces (sommeil, stress, alimentation, soin doux du cuir chevelu, habitudes). Aucune ne nomme de médicament ni d'acte médical. Une des trois peut suggérer, en douceur, d'en parler à un professionnel de santé pour explorer les options, sans rien prescrire.
- Une phrase courte, encourageante et personnalisée.

QUALITÉ DE LA PHOTO :
- Si la photo est trop floue, trop sombre, ne montre pas le cuir chevelu, ou n'est pas exploitable, mets "usable" à false, "score" et "norwood" à null, "zones" vide, et demande gentiment une meilleure photo dans "message".

SORTIE :
- Tu réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans bloc de code, sans commentaire.
- Les clés exactes sont : usable (booléen), score (entier 0-100 ou null), norwood (chaîne "I"-"VII" ou null), zones (tableau de chaînes en français), recommendations (tableau de 3 chaînes en français), message (chaîne en français, tutoiement), confidence ("low" | "medium" | "high").`;

const PROMPT_VERSION = "analyse-v2";

interface AnalysisResult {
  usable: boolean;
  score: number | null;
  norwood: string | null;
  zones: string[];
  recommendations: string[];
  message: string;
  confidence: string;
}

function validateResult(obj: Record<string, unknown>): AnalysisResult | null {
  if (typeof obj.usable !== "boolean") return null;
  if (obj.usable) {
    if (typeof obj.score !== "number" || obj.score < 0 || obj.score > 100) return null;
    const validNorwood = ["I", "II", "III", "IV", "V", "VI", "VII"];
    if (typeof obj.norwood !== "string" || !validNorwood.includes(obj.norwood)) return null;
  }
  if (!Array.isArray(obj.zones)) return null;
  if (!Array.isArray(obj.recommendations) || obj.recommendations.length < 1) return null;
  if (typeof obj.message !== "string") return null;

  return {
    usable: obj.usable as boolean,
    score: obj.usable ? (obj.score as number) : null,
    norwood: obj.usable ? (obj.norwood as string) : null,
    zones: obj.zones as string[],
    recommendations: obj.recommendations as string[],
    message: obj.message as string,
    confidence: (obj.confidence as string) || "medium",
  };
}

type ScanImage = { base64: string; mediaType: string };

async function callAnalysis(
  client: Anthropic,
  images: ScanImage[],
  model: string,
  strict = false
): Promise<AnalysisResult> {
  const userText = strict
    ? "Réponds UNIQUEMENT avec le JSON valide demandé, rien d'autre. Analyse ces photos de cuir chevelu."
    : images.length > 1
      ? "Analyse ces photos (face + dessus du crâne) du même cuir chevelu."
      : "Analyse cette photo de cuir chevelu.";

  const imageBlocks = images.map((im) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: im.mediaType as "image/jpeg", data: im.base64 },
  }));

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = validateResult(parsed);
  if (!validated) throw new Error("Invalid schema");

  return validated;
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { scanId } = await request.json();
  if (!scanId) return NextResponse.json({ error: "scanId manquant" }, { status: 400 });

  const admin = createAdminClient();

  const { data: scan } = await admin.from("scans")
    .select("id, photo_path, user_id")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) return NextResponse.json({ error: "Scan introuvable" }, { status: 404 });

  if (scan.photo_path) {
    await admin.storage.from("scalp-photos").remove([scan.photo_path]);
  }

  await admin.from("projections").delete().eq("scan_id", scanId);
  await admin.from("scans").delete().eq("id", scanId);

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée" }, { status: 500 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de scans en peu de temps. Réessaie dans une minute." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const fileTop = formData.get("photo_top") as File | null;

    if (!file) return NextResponse.json({ error: "Aucune photo envoyée" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Photo trop lourde (max 10 Mo)" }, { status: 400 });
    // N'envoyer à l'IA (facturée) que des images réelles, jamais un autre type déguisé.
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté (JPEG, PNG ou WebP)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type || "image/jpeg";

    // Image du dessus du crâne (optionnelle) : on l'ajoute à l'analyse si valide.
    const images: ScanImage[] = [{ base64, mediaType }];
    if (fileTop && fileTop.size > 0 && fileTop.size <= 10 * 1024 * 1024 && ALLOWED.includes(fileTop.type)) {
      const topBytes = await fileTop.arrayBuffer();
      images.push({ base64: Buffer.from(topBytes).toString("base64"), mediaType: fileTop.type });
    }

    const model = process.env.SCAN_MODEL || "claude-haiku-4-5-20251001";
    const client = new Anthropic({ apiKey, timeout: 30_000 });

    let result: AnalysisResult;
    try {
      result = await callAnalysis(client, images, model);
    } catch {
      result = await callAnalysis(client, images, model, true);
    }

    // Save scan to database + upload photo server-side
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let scanId: string | undefined;
    let photoPath: string | undefined;
    if (user) {
      const admin = createAdminClient();
      const tempId = crypto.randomUUID();
      photoPath = `${user.id}/${tempId}/original.jpg`;

      await admin.storage
        .from("scalp-photos")
        .upload(photoPath, Buffer.from(bytes), { contentType: "image/jpeg" });

      const { data: scan } = await admin.from("scans").insert({
        user_id: user.id,
        score: result.score,
        norwood: result.norwood,
        zones: result.zones,
        recommendations: result.recommendations,
        message: result.message,
        raw_analysis: result,
        status: result.usable ? "done" : "unusable",
        prompt_version: PROMPT_VERSION,
        photo_path: photoPath,
      }).select("id").single();
      scanId = scan?.id;
    }

    return NextResponse.json({
      ...result,
      scanId,
      photoPath,
      prompt_version: PROMPT_VERSION,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
