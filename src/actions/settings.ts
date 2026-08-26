"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { saveUploadedImage } from "@/actions/upload";
import { z } from "zod";

const settingsSchema = z.object({
  nutritionistName: z.string().min(1, "Nome é obrigatório"),
  crn: z.string().min(1, "CRN é obrigatório"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  instagram: z.string().optional(),
  footerText: z.string().optional(),
});

export async function updateProfessionalSettings(formData: FormData) {
  const parsed = settingsSchema.parse({
    nutritionistName: formData.get("nutritionistName"),
    crn: formData.get("crn"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    instagram: formData.get("instagram") || undefined,
    footerText: formData.get("footerText") || undefined,
  });

  const logoFile = formData.get("logo") as File | null;
  const logoUrl = await saveUploadedImage(logoFile, "settings");

  // 9.12 — assinatura enviada pela própria nutricionista (nunca gerada/inventada aqui).
  const signatureFile = formData.get("signature") as File | null;
  const signatureUrl = await saveUploadedImage(signatureFile, "settings");

  await prisma.professionalSettings.upsert({
    where: { id: "default" },
    update: { ...parsed, email: parsed.email || null, ...(logoUrl ? { logoUrl } : {}), ...(signatureUrl ? { signatureUrl } : {}) },
    create: { id: "default", ...parsed, email: parsed.email || null, logoUrl: logoUrl ?? undefined, signatureUrl: signatureUrl ?? undefined },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/planos", "layout");
  revalidatePath("/clients", "layout");
}

const guidanceTextTypes = ["ORIENTACAO_GERAL", "HIDRATACAO", "SUPLEMENTACAO", "PRE_TREINO", "TAREFA_INICIAL"] as const;

const guidanceTextSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  type: z.enum(guidanceTextTypes).default("ORIENTACAO_GERAL"),
  tags: z.string().optional(),
});

export async function createGuidanceText(formData: FormData) {
  const parsed = guidanceTextSchema.parse({
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type") || "ORIENTACAO_GERAL",
    tags: formData.get("tags") || undefined,
  });
  await prisma.guidanceText.create({ data: parsed });
  revalidatePath("/textos");
}

export async function updateGuidanceText(formData: FormData) {
  const id = formData.get("id") as string;
  const parsed = guidanceTextSchema.parse({
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type") || "ORIENTACAO_GERAL",
    tags: formData.get("tags") || undefined,
  });
  await prisma.guidanceText.update({ where: { id }, data: parsed });
  revalidatePath("/textos");
}

export async function deleteGuidanceText(id: string) {
  await prisma.guidanceText.delete({ where: { id } });
  revalidatePath("/textos");
}
