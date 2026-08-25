"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { saveGeneratedImage, saveUploadedImage } from "@/actions/upload";

/**
 * Biblioteca de imagens (5.11) — busca no Pixabay, upload próprio, e reaproveitamento da
 * biblioteca já existente. Compartilhada por alimentos, receitas, suplementos e produtos de
 * marca (uma implementação, quatro usos — 5.11 intro). A regra que não muda entre as portas: o
 * arquivo sempre termina no storage próprio, nunca uma URL de domínio de terceiro gravada.
 */

export type PixabayHit = {
  id: number;
  webformatURL: string;
  previewURL: string;
  pageURL: string;
  user: string;
  imageWidth: number;
  imageHeight: number;
};

export type SearchPixabayResult =
  | { ok: true; hits: PixabayHit[] }
  | { ok: false; reason: "sem_chave" | "erro" };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — exigência da licença do Pixabay (5.11.3)

/** Busca no Pixabay com cache de 24h (5.11.3). `lang` "pt" por padrão — 5.11.2 oferece
 * "buscar em inglês" como alternativa (acervo maior). */
export async function searchPixabayImages(query: string, lang: "pt" | "en" = "pt"): Promise<SearchPixabayResult> {
  const apiKey = process.env.PIXABAY_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "sem_chave" };

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return { ok: true, hits: [] };
  const cacheKey = `${lang}:${trimmed}`;

  const cached = await prisma.pixabaySearchCache.findUnique({ where: { query: cacheKey } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { ok: true, hits: cached.payload as unknown as PixabayHit[] };
  }

  try {
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(trimmed)}&image_type=photo&category=food&lang=${lang}&per_page=20&safesearch=true`;
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: "erro" };
    const data = (await res.json()) as { hits?: PixabayHit[] };
    const hits = data.hits ?? [];

    await prisma.pixabaySearchCache.upsert({
      where: { query: cacheKey },
      update: { payload: hits as unknown as object, fetchedAt: new Date() },
      create: { query: cacheKey, payload: hits as unknown as object },
    });

    return { ok: true, hits };
  } catch {
    return { ok: false, reason: "erro" };
  }
}

/** Escolhe uma imagem da grade do Pixabay: baixa (nunca hotlink) e grava um ImageAsset. */
export async function selectPixabayImage(hit: PixabayHit, searchTerm: string, altText: string) {
  const actor = await getCurrentUser();

  const imageRes = await fetch(hit.webformatURL);
  if (!imageRes.ok) throw new Error("Não foi possível baixar a imagem escolhida.");
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const filename = `${Date.now()}-${hit.id}.jpg`;
  const url = await saveGeneratedImage(buffer, "biblioteca-imagens/pixabay", filename, "image/jpeg");

  return prisma.imageAsset.create({
    data: {
      url,
      thumbUrl: hit.previewURL,
      source: "PIXABAY",
      sourceRef: String(hit.id),
      sourcePageUrl: hit.pageURL,
      author: hit.user,
      license: "Pixabay Content License",
      altText,
      searchTerm,
      width: hit.imageWidth,
      height: hit.imageHeight,
      bytes: buffer.byteLength,
      uploadedByUserId: actor?.id ?? null,
    },
  });
}

/** Aba "Minha foto" (5.11.2) — upload direto da Luana. */
export async function uploadOwnImage(file: File, searchTerm: string | null, altText: string) {
  const actor = await getCurrentUser();

  const url = await saveUploadedImage(file, "biblioteca-imagens/upload");
  if (!url) throw new Error("Falha ao enviar a imagem.");

  return prisma.imageAsset.create({
    data: {
      url,
      thumbUrl: url,
      source: "UPLOAD_NUTRICIONISTA",
      sourceRef: file.name,
      license: "Foto própria — Luana Gois",
      altText,
      searchTerm,
      bytes: file.size,
      uploadedByUserId: actor?.id ?? null,
    },
  });
}

/** "Escolher da biblioteca" (5.11.2 ponto final) — reaproveita um ImageAsset já baixado, evita
 * duplicar arquivo (ex.: a mesma foto de ovo serve ao alimento e à receita). */
export async function searchImageLibrary(searchTerm: string) {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];
  return prisma.imageAsset.findMany({
    where: { searchTerm: { contains: trimmed, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
