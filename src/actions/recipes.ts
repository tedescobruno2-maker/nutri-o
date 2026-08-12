"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { saveUploadedImage } from "@/actions/upload";

const ingredientItemSchema = z.object({
  foodId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().optional(),
});

const createRecipeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  ingredients: z.string().min(1, "Ingredientes são obrigatórios"),
  instructions: z.string().optional(),
  calories: z.coerce.number().int().positive().optional(),
  protein: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  tags: z.string().optional(),
});

export async function createRecipe(formData: FormData) {
  const parsed = createRecipeSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    ingredients: formData.get("ingredients"),
    instructions: formData.get("instructions") || undefined,
    calories: formData.get("calories") || undefined,
    protein: formData.get("protein") || undefined,
    carbs: formData.get("carbs") || undefined,
    fat: formData.get("fat") || undefined,
    tags: formData.get("tags") || undefined,
  });

  const photoFile = formData.get("photo") as File | null;
  const imageUrl = await saveUploadedImage(photoFile, "recipes");

  const itemsJson = formData.get("ingredientItemsJson") as string | null;
  const items = itemsJson ? ingredientItemSchema.array().parse(JSON.parse(itemsJson)) : [];

  await prisma.recipe.create({
    data: {
      ...parsed,
      imageUrl: imageUrl ?? undefined,
      ingredientItems: {
        create: items
          .filter((item) => item.foodId || item.description)
          .map((item, index) => ({ ...item, order: index })),
      },
    },
  });

  revalidatePath("/recipes");
  revalidatePath("/");
}

export async function deleteRecipe(recipeId: string) {
  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath("/recipes");
  revalidatePath("/");
}
