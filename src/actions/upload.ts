"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured || !supabaseAdmin) return;
  const { data } = await supabaseAdmin.storage.listBuckets();
  if (!data?.some((b) => b.name === STORAGE_BUCKET)) {
    await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, { public: true });
  }
  bucketEnsured = true;
}

/**
 * Salva uma imagem enviada via <input type="file">.
 * Em produção (com SUPABASE_URL/SUPABASE_SECRET_KEY configurados), envia para o
 * Supabase Storage e retorna a URL pública — necessário porque o filesystem do
 * Vercel é efêmero/somente leitura. Em desenvolvimento local sem essas variáveis,
 * grava em public/uploads/<folder>/ como fallback.
 */
export async function saveUploadedImage(file: File | null, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.");
  if (file.size > MAX_BYTES) throw new Error("Imagem muito grande (máx. 5MB).");

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (supabaseAdmin) {
    await ensureBucket();
    const objectPath = `${folder}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, buffer, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Falha ao enviar imagem: ${error.message}`);

    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  // Fallback local (apenas desenvolvimento — não persiste em produção serverless).
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}
