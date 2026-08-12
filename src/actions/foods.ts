"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createFoodSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  defaultUnit: z.string().min(1).default("g"),
  kcal100: z.coerce.number().min(0),
  protein100: z.coerce.number().min(0),
  carbs100: z.coerce.number().min(0),
  fat100: z.coerce.number().min(0),
  fiber100: z.coerce.number().min(0).optional(),
});

export async function createFood(formData: FormData) {
  const parsed = createFoodSchema.parse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    defaultUnit: formData.get("defaultUnit") || "g",
    kcal100: formData.get("kcal100"),
    protein100: formData.get("protein100"),
    carbs100: formData.get("carbs100"),
    fat100: formData.get("fat100"),
    fiber100: formData.get("fiber100") || undefined,
  });

  await prisma.food.upsert({
    where: { name: parsed.name },
    update: parsed,
    create: parsed,
  });

  revalidatePath("/alimentos");
}

export async function deleteFood(foodId: string) {
  await prisma.food.delete({ where: { id: foodId } });
  revalidatePath("/alimentos");
}
