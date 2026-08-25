"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { supabaseAdmin, PUBLIC_BUCKET, PATIENT_BUCKET } from "@/lib/supabase";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const DOCUMENT_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  "application/pdf": "pdf",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
// Documentos (laudos de exame com imagem, relatórios digitalizados) passam facilmente de 5MB.
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024; // 15MB

const bucketsEnsured = new Set<string>();
async function ensureBucket(bucket: string, isPublic: boolean) {
  if (bucketsEnsured.has(bucket) || !supabaseAdmin) return;
  const { data } = await supabaseAdmin.storage.listBuckets();
  if (!data?.some((b) => b.name === bucket)) {
    await supabaseAdmin.storage.createBucket(bucket, { public: isPublic });
  }
  bucketsEnsured.add(bucket);
}

/**
 * Salva um arquivo enviado via <input type="file">.
 * Em produção (com SUPABASE_URL/SUPABASE_SECRET_KEY configurados), envia para o Supabase Storage —
 * necessário porque o filesystem do Vercel é efêmero/somente leitura. Em desenvolvimento local sem
 * essas variáveis, grava em public/uploads/<folder>/ como fallback.
 *
 * Para bucket público (`isPublic: true`), retorna a URL pública direta.
 * Para bucket privado (`isPublic: false`), retorna o CAMINHO do objeto — não uma URL. A resolução
 * para URL assinada (TTL curto) acontece no momento da exibição, via `getSignedDocumentUrl`.
 */
async function saveUploadedFile(
  file: File | null,
  folder: string,
  allowedTypes: Record<string, string>,
  errorLabel: string,
  maxBytes: number,
  bucket: string,
  isPublic: boolean
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = allowedTypes[file.type];
  if (!ext) throw new Error(`Formato de ${errorLabel} não suportado.`);
  if (file.size > maxBytes) throw new Error(`Arquivo muito grande (máx. ${Math.round(maxBytes / (1024 * 1024))}MB).`);

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (supabaseAdmin) {
    await ensureBucket(bucket, isPublic);
    const objectPath = `${folder}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, buffer, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Falha ao enviar arquivo: ${error.message}`);

    if (isPublic) {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
      return data.publicUrl;
    }
    return objectPath;
  }

  // Fallback local (apenas desenvolvimento — não persiste em produção serverless).
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

export async function saveUploadedImage(file: File | null, folder: string): Promise<string | null> {
  return saveUploadedFile(file, folder, IMAGE_TYPES, "imagem (use JPG, PNG, WEBP ou GIF)", MAX_IMAGE_BYTES, PUBLIC_BUCKET, true);
}

export async function saveUploadedDocument(file: File | null, folder: string): Promise<string | null> {
  return saveUploadedFile(file, folder, DOCUMENT_TYPES, "arquivo (use PDF, JPG, PNG ou WEBP)", MAX_DOCUMENT_BYTES, PATIENT_BUCKET, false);
}

/**
 * Resolve um caminho de documento privado (salvo por `saveUploadedDocument`) para uma URL
 * assinada de curta duração. Se o valor já for uma URL/caminho diretamente acessível (fallback
 * local de desenvolvimento, ou dado legado), retorna como está.
 */
/** Salva um documento gerado no servidor (ex.: PDF de plano alimentar) — não vem de um <input>. */
export async function saveGeneratedDocument(buffer: Buffer, folder: string, filename: string, contentType: string): Promise<string> {
  if (!supabaseAdmin) {
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    return `/uploads/${folder}/${filename}`;
  }

  await ensureBucket(PATIENT_BUCKET, false);
  const objectPath = `${folder}/${filename}`;
  const { error } = await supabaseAdmin.storage.from(PATIENT_BUCKET).upload(objectPath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Falha ao salvar documento gerado: ${error.message}`);
  return objectPath;
}

export async function getSignedDocumentUrl(objectPathOrUrl: string, ttlSeconds = 300): Promise<string | null> {
  if (!objectPathOrUrl) return null;
  if (objectPathOrUrl.startsWith("http") || objectPathOrUrl.startsWith("/uploads/")) {
    return objectPathOrUrl;
  }
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.storage.from(PATIENT_BUCKET).createSignedUrl(objectPathOrUrl, ttlSeconds);
  if (error) return null;
  return data.signedUrl;
}
