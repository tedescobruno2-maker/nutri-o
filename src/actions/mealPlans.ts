"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
}

const createMealPlanSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1).default("Plano Alimentar"),
  objective: z.string().optional(),
  generalGuidelines: z.string().optional(),
});

export async function createMealPlan(formData: FormData) {
  const parsed = createMealPlanSchema.parse({
    clientId: formData.get("clientId"),
    title: formData.get("title") || "Plano Alimentar",
    objective: formData.get("objective") || undefined,
    generalGuidelines: formData.get("generalGuidelines") || undefined,
  });

  await prisma.$transaction([
    prisma.mealPlan.updateMany({ where: { clientId: parsed.clientId, active: true }, data: { active: false } }),
    prisma.mealPlan.create({ data: parsed }),
  ]);

  revalidateClient(parsed.clientId);
}

export async function updateMealPlanGuidelines(mealPlanId: string, clientId: string, formData: FormData) {
  const objective = (formData.get("objective") as string) || undefined;
  const generalGuidelines = (formData.get("generalGuidelines") as string) || undefined;
  await prisma.mealPlan.update({ where: { id: mealPlanId }, data: { objective, generalGuidelines } });
  revalidateClient(clientId);
}

const addMealSchema = z.object({
  mealPlanId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
});

export async function addMeal(formData: FormData) {
  const parsed = addMealSchema.parse({
    mealPlanId: formData.get("mealPlanId"),
    clientId: formData.get("clientId"),
    name: formData.get("name"),
  });

  const count = await prisma.meal.count({ where: { mealPlanId: parsed.mealPlanId } });
  await prisma.meal.create({ data: { mealPlanId: parsed.mealPlanId, name: parsed.name, order: count } });
  revalidateClient(parsed.clientId);
}

export async function deleteMeal(mealId: string, clientId: string) {
  await prisma.meal.delete({ where: { id: mealId } });
  revalidateClient(clientId);
}

const addMealOptionSchema = z.object({
  mealId: z.string().min(1),
  clientId: z.string().min(1),
  label: z.string().min(1).default("Opção"),
  freeText: z.string().min(1),
});

export async function addMealOption(formData: FormData) {
  const parsed = addMealOptionSchema.parse({
    mealId: formData.get("mealId"),
    clientId: formData.get("clientId"),
    label: formData.get("label") || "Opção",
    freeText: formData.get("freeText"),
  });

  const count = await prisma.mealOption.count({ where: { mealId: parsed.mealId } });
  await prisma.mealOption.create({
    data: { mealId: parsed.mealId, label: parsed.label, freeText: parsed.freeText, order: count },
  });
  revalidateClient(parsed.clientId);
}

export async function deleteMealOption(mealOptionId: string, clientId: string) {
  await prisma.mealOption.delete({ where: { id: mealOptionId } });
  revalidateClient(clientId);
}

const addMealOptionItemSchema = z.object({
  mealOptionId: z.string().min(1),
  clientId: z.string().min(1),
  foodId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().optional(),
});

export async function addMealOptionItem(formData: FormData) {
  const parsed = addMealOptionItemSchema.parse({
    mealOptionId: formData.get("mealOptionId"),
    clientId: formData.get("clientId"),
    foodId: formData.get("foodId") || undefined,
    description: formData.get("description") || undefined,
    quantity: formData.get("quantity") || undefined,
    unit: formData.get("unit") || undefined,
  });

  const count = await prisma.mealOptionItem.count({ where: { mealOptionId: parsed.mealOptionId } });
  await prisma.mealOptionItem.create({
    data: {
      mealOptionId: parsed.mealOptionId,
      foodId: parsed.foodId,
      description: parsed.description,
      quantity: parsed.quantity,
      unit: parsed.unit,
      order: count,
    },
  });
  revalidateClient(parsed.clientId);
}

export async function deleteMealOptionItem(itemId: string, clientId: string) {
  await prisma.mealOptionItem.delete({ where: { id: itemId } });
  revalidateClient(clientId);
}
