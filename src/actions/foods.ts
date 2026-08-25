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
  kcal100: z.coerce.number().min(0).optional(),
  protein100: z.coerce.number().min(0).optional(),
  carbs100: z.coerce.number().min(0).optional(),
  fat100: z.coerce.number().min(0).optional(),
  fiber100: z.coerce.number().min(0).optional(),
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

export async function deleteFood(foodId: string) {
  await prisma.food.delete({ where: { id: foodId } });
  revalidatePath("/alimentos");
}
