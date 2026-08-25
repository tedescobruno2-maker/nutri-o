"use server";

import { gemini, FOOD_SUGGEST_SCHEMA, FOOD_SUGGEST_PROMPT, type FoodSuggestData } from "@/lib/gemini";
import { supabaseAdmin, PUBLIC_BUCKET } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export type SuggestFoodResult =
  | { ok: true; data: FoodSuggestData & { imageUrl: string | null } }
  | { ok: false; error: string };

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured || !supabaseAdmin) return;
  const { data } = await supabaseAdmin.storage.listBuckets();
  if (!data?.some((b) => b.name === PUBLIC_BUCKET)) {
    await supabaseAdmin.storage.createBucket(PUBLIC_BUCKET, { public: true });
  }
  bucketEnsured = true;
}

/** Busca uma foto no Pixabay (API oficial) e a salva no Supabase Storage. Retorna null se
 * PIXABAY_API_KEY não estiver configurada, ou se nada relevante for encontrado. */
async function findAndStorePhoto(query: string): Promise<string | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey || !supabaseAdmin) return null;

  try {
    const searchUrl = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&category=food&lang=pt&per_page=3&safesearch=true`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as { hits?: Array<{ webformatURL: string; largeImageURL: string }> };
    const hit = searchData.hits?.[0];
    if (!hit) return null;

    const imageRes = await fetch(hit.webformatURL);
    if (!imageRes.ok) return null;
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    await ensureBucket();
    const objectPath = `foods/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from(PUBLIC_BUCKET)
      .upload(objectPath, buffer, { contentType: "image/jpeg", upsert: false });
    if (error) return null;

    const { data } = supabaseAdmin.storage.from(PUBLIC_BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function suggestFoodData(formData: FormData): Promise<SuggestFoodResult> {
  if (!gemini) {
    return { ok: false, error: "GEMINI_API_KEY não configurada no servidor." };
  }
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    return { ok: false, error: "Digite o nome do alimento primeiro." };
  }

  let data: FoodSuggestData;
  try {
    const result = await gemini.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: FOOD_SUGGEST_PROMPT(name) }] }],
      config: { responseMimeType: "application/json", responseSchema: FOOD_SUGGEST_SCHEMA },
    });
    const text = result.text;
    if (!text) return { ok: false, error: "A IA não retornou dados. Tente novamente." };
    data = JSON.parse(text) as FoodSuggestData;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao consultar a IA." };
  }

  const imageUrl = await findAndStorePhoto(data.imageSearchQuery);

  const actor = await getCurrentUser();
  await logAudit({ actorUserId: actor?.id, action: "CHAMADA_IA", entity: "Food", metadata: { finalidade: "sugestao_nutricional", nome: name } });

  return { ok: true, data: { ...data, imageUrl } };
}
