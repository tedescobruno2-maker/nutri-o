"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

const slotSchema = z.object({
  name: z.string().min(1),
  recipeIds: z.array(z.string()).min(1),
});

const inputSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1).default("Plano Alimentar"),
  objective: z.string().optional(),
  slots: z.array(slotSchema).min(1, "Adicione ao menos uma receita a alguma refeição"),
});

export type PlanBuilderInput = z.infer<typeof inputSchema>;

export async function createMealPlanFromRecipes(input: PlanBuilderInput) {
  const { clientId, title, objective, slots } = inputSchema.parse(input);

  const recipeIds = [...new Set(slots.flatMap((s) => s.recipeIds))];
  const recipes = await prisma.recipe.findMany({ where: { id: { in: recipeIds } } });
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Paciente não encontrado");

  await prisma.mealPlan.updateMany({ where: { clientId, active: true }, data: { active: false, status: "SUBSTITUIDO" } });

  const mealPlan = await prisma.mealPlan.create({
    data: { clientId, title, objective, active: true },
  });

  for (const [mealIndex, slot] of slots.entries()) {
    const meal = await prisma.meal.create({
      data: { mealPlanId: mealPlan.id, name: slot.name, order: mealIndex },
    });

    for (const [optionIndex, recipeId] of slot.recipeIds.entries()) {
      const recipe = recipeById.get(recipeId);
      if (!recipe) continue;

      const option = await prisma.mealOption.create({
        data: {
          mealId: meal.id,
          label: recipe.name,
          order: optionIndex,
          freeText: recipe.ingredients,
        },
      });

      await prisma.mealOptionItem.create({
        data: { mealOptionId: option.id, recipeId: recipe.id, itemType: "RECEITA", order: 0 },
      });
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/planos");

  return { mealPlanId: mealPlan.id };
}
