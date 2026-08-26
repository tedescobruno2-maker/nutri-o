"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { saveUploadedImage } from "@/actions/upload";

const createFoodSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  brand: z.string().optional(),
  defaultUnit: z.string().min(1).default("g"),
  source: z.enum(["MANUAL", "ROTULO"]).default("MANUAL"),
  sourceRef: z.string().optional(),
  // Arredondado na entrada — kcal inteiro, demais campos com 1 casa (mesma convenção de recipeCalc.ts),
  // pra não deixar um valor colado do rótulo/planilha entrar com ruído de várias casas decimais.
  kcal100: z.coerce.number().min(0).optional().transform((n) => (n == null ? n : Math.round(n))),
  protein100: z.coerce.number().min(0).optional().transform((n) => (n == null ? n : Math.round(n * 10) / 10)),
  carbs100: z.coerce.number().min(0).optional().transform((n) => (n == null ? n : Math.round(n * 10) / 10)),
  fat100: z.coerce.number().min(0).optional().transform((n) => (n == null ? n : Math.round(n * 10) / 10)),
  fiber100: z.coerce.number().min(0).optional().transform((n) => (n == null ? n : Math.round(n * 10) / 10)),
});

export async function createFood(formData: FormData) {
  const parsed = createFoodSchema.parse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    brand: formData.get("brand") || undefined,
    defaultUnit: formData.get("defaultUnit") || "g",
    source: formData.get("source") || "MANUAL",
    sourceRef: formData.get("sourceRef") || undefined,
    kcal100: formData.get("kcal100") || undefined,
    protein100: formData.get("protein100") || undefined,
    carbs100: formData.get("carbs100") || undefined,
    fat100: formData.get("fat100") || undefined,
    fiber100: formData.get("fiber100") || undefined,
  });

  const photoFile = formData.get("photo") as File | null;
  const uploadedImageUrl = await saveUploadedImage(photoFile, "foods");
  const aiImageUrl = (formData.get("aiImageUrl") as string | null) || undefined;
  const imageUrl = uploadedImageUrl || aiImageUrl || null;

  await prisma.food.create({
    data: {
      name: parsed.name,
      baseName: parsed.name,
      category: parsed.category,
      brand: parsed.brand,
      defaultUnit: parsed.defaultUnit,
      source: parsed.source,
      sourceRef: parsed.sourceRef,
      // sem kcal registrado, o alimento fica PENDENTE — não entra em somatório calórico algum
      // até alguém confirmar o valor (guardrail: nunca inventar valor nutricional).
      nutrientStatus: parsed.kcal100 != null ? "VALIDADO" : "PENDENTE",
      kcal100: parsed.kcal100,
      protein100: parsed.protein100,
      carbs100: parsed.carbs100,
      fat100: parsed.fat100,
      fiber100: parsed.fiber100,
      imageUrl: imageUrl ?? undefined,
    },
  });

  revalidatePath("/alimentos");
}

const updateFoodSchema = createFoodSchema.extend({ id: z.string().min(1) });

/** Edição (Fase 2 da reorganização do Plano Alimentar — antes só existia criar/apagar). Ao
 * contrário de createFood, aqui um campo deixado em branco precisa LIMPAR o valor anterior
 * (?? null) — inclusive permite voltar um alimento para "pendente" apagando o kcal. baseName
 * (usado pro agrupamento de variantes de preparo em getFoodsGrouped) nunca é tocado aqui: mudar
 * o nome de exibição de uma variante não deve reagrupá-la. */
export async function updateFood(formData: FormData) {
  const parsed = updateFoodSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    brand: formData.get("brand") || undefined,
    defaultUnit: formData.get("defaultUnit") || "g",
    source: formData.get("source") || "MANUAL",
    sourceRef: formData.get("sourceRef") || undefined,
    kcal100: formData.get("kcal100") || undefined,
    protein100: formData.get("protein100") || undefined,
    carbs100: formData.get("carbs100") || undefined,
    fat100: formData.get("fat100") || undefined,
    fiber100: formData.get("fiber100") || undefined,
  });

  const photoFile = formData.get("photo") as File | null;
  const uploadedImageUrl = await saveUploadedImage(photoFile, "foods");
  const aiImageUrl = (formData.get("aiImageUrl") as string | null) || undefined;
  const imageUrl = uploadedImageUrl || aiImageUrl;

  await prisma.food.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      category: parsed.category ?? null,
      brand: parsed.brand ?? null,
      defaultUnit: parsed.defaultUnit,
      source: parsed.source,
      sourceRef: parsed.sourceRef ?? null,
      nutrientStatus: parsed.kcal100 != null ? "VALIDADO" : "PENDENTE",
      kcal100: parsed.kcal100 ?? null,
      protein100: parsed.protein100 ?? null,
      carbs100: parsed.carbs100 ?? null,
      fat100: parsed.fat100 ?? null,
      fiber100: parsed.fiber100 ?? null,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  revalidatePath("/alimentos");
}

export async function deleteFood(foodId: string) {
  await prisma.food.delete({ where: { id: foodId } });
  revalidatePath("/alimentos");
}
