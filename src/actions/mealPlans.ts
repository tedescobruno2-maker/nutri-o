"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { findRestrictionConflict, type ClientRestrictions } from "@/lib/allergyMatch";
import { calcMealOptionItem, calcMealOptionFromItems, calcMealFromOptions, calcDayTotal, type MealOptionItemLike } from "@/lib/mealPlanCalc";
import { getMealPlanFullTree } from "@/lib/dal";

/** Fase 4: o editor do plano saiu da página do paciente e virou uma rota própria por
 * mealPlanId (/planos/[id]) — revalidamos o padrão da rota inteira (sem saber qual id
 * específico está aberto agora) junto com a página do paciente, que só mostra o histórico. */
function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/planos/[id]", "page");
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

  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const [, newPlan] = await prisma.$transaction([
    prisma.mealPlan.updateMany({ where: { clientId: parsed.clientId, active: true }, data: { active: false, status: "SUBSTITUIDO" } }),
    prisma.mealPlan.create({ data: parsed }),
  ]);

  await logAudit({ actorUserId: actor.id, action: "CRIAR", entity: "MealPlan", entityId: newPlan.id, clientId: parsed.clientId });
  revalidateClient(parsed.clientId);
  return { mealPlanId: newPlan.id };
}

export async function updateMealPlanGuidelines(mealPlanId: string, clientId: string, formData: FormData) {
  const objective = (formData.get("objective") as string) || undefined;
  const generalGuidelines = (formData.get("generalGuidelines") as string) || undefined;
  await prisma.mealPlan.update({ where: { id: mealPlanId }, data: { objective, generalGuidelines } });
  revalidateClient(clientId);
}

export async function setMealPlanConsultation(mealPlanId: string, clientId: string, consultationId: string | null) {
  await prisma.mealPlan.update({ where: { id: mealPlanId }, data: { consultationId } });
  revalidateClient(clientId);
}

export async function setMealPlanInitialGuidance(mealPlanId: string, clientId: string, initialGuidanceId: string | null, override?: string) {
  await prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: { initialGuidanceId, initialGuidanceOverride: override || null },
  });
  revalidateClient(clientId);
}

// ---------------------------------------------------------------------------
// Blocos (Meal)
// ---------------------------------------------------------------------------

const addMealSchema = z.object({
  mealPlanId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  blockType: z.string().optional(),
});

export async function addMeal(formData: FormData) {
  const parsed = addMealSchema.parse({
    mealPlanId: formData.get("mealPlanId"),
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    blockType: formData.get("blockType") || undefined,
  });

  const count = await prisma.meal.count({ where: { mealPlanId: parsed.mealPlanId } });
  await prisma.meal.create({
    data: {
      mealPlanId: parsed.mealPlanId,
      name: parsed.name,
      order: count,
      blockType: (parsed.blockType as never) || "LIVRE",
    },
  });
  revalidateClient(parsed.clientId);
}

export async function deleteMeal(mealId: string, clientId: string) {
  await prisma.meal.delete({ where: { id: mealId } });
  revalidateClient(clientId);
}

export async function updateMeal(
  mealId: string,
  clientId: string,
  data: { displayTitle?: string | null; suggestedTime?: string | null; separator?: "OU" | "LISTA"; visible?: boolean }
) {
  await prisma.meal.update({ where: { id: mealId }, data });
  revalidateClient(clientId);
}

export async function moveMeal(mealPlanId: string, clientId: string, mealId: string, direction: "up" | "down") {
  const meals = await prisma.meal.findMany({ where: { mealPlanId }, orderBy: { order: "asc" } });
  const index = meals.findIndex((m) => m.id === mealId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= meals.length) return;

  await prisma.$transaction([
    prisma.meal.update({ where: { id: meals[index].id }, data: { order: meals[swapWith].order } }),
    prisma.meal.update({ where: { id: meals[swapWith].id }, data: { order: meals[index].order } }),
  ]);
  revalidateClient(clientId);
}

// ---------------------------------------------------------------------------
// Opções (MealOption)
// ---------------------------------------------------------------------------

const addMealOptionSchema = z.object({
  mealId: z.string().min(1),
  clientId: z.string().min(1),
  label: z.string().min(1).default("Opção"),
  freeText: z.string().optional(),
});

export async function addMealOption(formData: FormData) {
  const parsed = addMealOptionSchema.parse({
    mealId: formData.get("mealId"),
    clientId: formData.get("clientId"),
    label: formData.get("label") || "Opção",
    freeText: formData.get("freeText") || undefined,
  });

  const count = await prisma.mealOption.count({ where: { mealId: parsed.mealId } });
  await prisma.mealOption.create({
    data: {
      mealId: parsed.mealId,
      label: parsed.label,
      freeText: parsed.freeText ?? "",
      isStructured: true,
      order: count,
    },
  });
  revalidateClient(parsed.clientId);
}

export async function deleteMealOption(mealOptionId: string, clientId: string) {
  await prisma.mealOption.delete({ where: { id: mealOptionId } });
  revalidateClient(clientId);
}

/** 5.10.3 — foto opcional para uma opção que não é receita cadastrada (combinação livre de
 * alimentos). Nunca sugerida automaticamente — a Luana decide quando buscar uma. */
export async function attachMealOptionImage(mealOptionId: string, imageAssetId: string | null, clientId: string) {
  await prisma.mealOption.update({ where: { id: mealOptionId }, data: { imageAssetId } });
  revalidateClient(clientId);
}

// ---------------------------------------------------------------------------
// Itens (MealOptionItem) — os quatro tipos de 5.4.3, com alerta de restrição (5.4.6)
// ---------------------------------------------------------------------------

const addMealOptionItemSchema = z.object({
  mealOptionId: z.string().min(1),
  clientId: z.string().min(1),
  foodId: z.string().optional(),
  foodMeasureId: z.string().optional(),
  recipeId: z.string().optional(),
  choiceGroupId: z.string().optional(),
  description: z.string().optional(),
  literalText: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
  quantityMax: z.coerce.number().positive().optional(),
  quantityText: z.string().optional(),
  unit: z.string().optional(),
  showPhoto: z.coerce.boolean().optional(),
  restrictionConfirmed: z.coerce.boolean().optional(),
});

export type AddMealOptionItemResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; needsConfirmation: true; field: string; term: string; itemLabel: string };

export async function addMealOptionItem(formData: FormData): Promise<AddMealOptionItemResult> {
  const parsed = addMealOptionItemSchema.parse({
    mealOptionId: formData.get("mealOptionId"),
    clientId: formData.get("clientId"),
    foodId: formData.get("foodId") || undefined,
    foodMeasureId: formData.get("foodMeasureId") || undefined,
    recipeId: formData.get("recipeId") || undefined,
    choiceGroupId: formData.get("choiceGroupId") || undefined,
    description: formData.get("description") || undefined,
    literalText: formData.get("literalText") || undefined,
    quantity: formData.get("quantity") || undefined,
    quantityMax: formData.get("quantityMax") || undefined,
    quantityText: formData.get("quantityText") || undefined,
    unit: formData.get("unit") || undefined,
    showPhoto: formData.get("showPhoto") || undefined,
    restrictionConfirmed: formData.get("restrictionConfirmed") || undefined,
  });

  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const itemType = parsed.foodId ? "ALIMENTO" : parsed.recipeId ? "RECEITA" : parsed.choiceGroupId ? "GRUPO_ESCOLHA" : "TEXTO_LIVRE";

  // Textos a checar contra as restrições cadastradas — alimento em si, ou (para receita/grupo)
  // também o nome de cada ingrediente/opção, porque "queijo minas" dentro de uma receita de
  // omelete não aparece no nome da receita.
  const client = await prisma.client.findUnique({
    where: { id: parsed.clientId },
    select: { allergies: true, intolerances: true, dietaryRestrictions: true, foodAversions: true },
  });
  const restrictions: ClientRestrictions = client ?? {};

  const textsToCheck: string[] = [];
  let itemLabel = parsed.description || "item";
  if (itemType === "ALIMENTO" && parsed.foodId) {
    const food = await prisma.food.findUnique({ where: { id: parsed.foodId } });
    if (food) {
      textsToCheck.push(food.name);
      itemLabel = food.name;
    }
  } else if (itemType === "RECEITA" && parsed.recipeId) {
    const recipe = await prisma.recipe.findUnique({ where: { id: parsed.recipeId }, include: { ingredientItems: { include: { food: true } } } });
    if (recipe) {
      textsToCheck.push(recipe.name, ...recipe.ingredientItems.map((i) => i.food?.name).filter((n): n is string => !!n));
      itemLabel = recipe.name;
    }
  } else if (itemType === "GRUPO_ESCOLHA" && parsed.choiceGroupId) {
    const group = await prisma.choiceGroup.findUnique({ where: { id: parsed.choiceGroupId }, include: { items: { include: { food: true } } } });
    if (group) {
      textsToCheck.push(group.name, ...group.items.map((i) => i.food?.name ?? i.description).filter((n): n is string => !!n));
      itemLabel = group.name;
    }
  } else if (parsed.description) {
    textsToCheck.push(parsed.description);
  }

  let conflict: { field: string; term: string } | null = null;
  for (const text of textsToCheck) {
    const found = findRestrictionConflict(text, restrictions);
    if (found) {
      conflict = found;
      break;
    }
  }

  if (conflict && !parsed.restrictionConfirmed) {
    return { ok: false, needsConfirmation: true, field: conflict.field, term: conflict.term, itemLabel };
  }

  const count = await prisma.mealOptionItem.count({ where: { mealOptionId: parsed.mealOptionId } });
  const created = await prisma.mealOptionItem.create({
    data: {
      mealOptionId: parsed.mealOptionId,
      foodId: parsed.foodId,
      foodMeasureId: parsed.foodMeasureId,
      recipeId: parsed.recipeId,
      choiceGroupId: parsed.choiceGroupId,
      description: parsed.description,
      literalText: parsed.literalText,
      quantity: parsed.quantity,
      quantityMax: parsed.quantityMax,
      quantityText: parsed.quantityText,
      unit: parsed.unit,
      showPhoto: parsed.showPhoto ?? false,
      itemType: itemType as never,
      order: count,
    },
  });

  if (conflict) {
    await logAudit({
      actorUserId: actor.id,
      action: "CRIAR",
      entity: "MealOptionItem",
      entityId: created.id,
      clientId: parsed.clientId,
      metadata: { restricaoConfirmada: true, restricao: conflict.term, campo: conflict.field, item: itemLabel },
    });
  }

  revalidateClient(parsed.clientId);
  return { ok: true };
}

export async function deleteMealOptionItem(itemId: string, clientId: string) {
  await prisma.mealOptionItem.delete({ where: { id: itemId } });
  revalidateClient(clientId);
}

// ---------------------------------------------------------------------------
// Duplicar, salvar/aplicar modelo, finalizar (5.4.5)
// ---------------------------------------------------------------------------

export async function duplicateMealPlan(mealPlanId: string, clientId: string) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const original = await getMealPlanFullTree(mealPlanId);
  if (!original) throw new Error("Plano não encontrado.");
  if (original.clientId !== clientId) throw new Error("Este plano não pertence a este paciente.");

  const result = await prisma.$transaction(async (tx) => {
    await tx.mealPlan.updateMany({ where: { clientId, active: true }, data: { active: false, status: "SUBSTITUIDO" } });

    const newPlan = await tx.mealPlan.create({
      data: {
        clientId,
        title: original.title,
        objective: original.objective,
        generalGuidelines: original.generalGuidelines,
        consultationId: null, // consulta de referência é sempre reavaliada no novo plano — nunca herdada
        initialGuidanceId: original.initialGuidanceId,
        initialGuidanceOverride: original.initialGuidanceOverride,
        version: original.version + 1,
        status: "RASCUNHO",
        active: true,
      },
    });

    for (const meal of original.meals) {
      const newMeal = await tx.meal.create({
        data: {
          mealPlanId: newPlan.id,
          name: meal.name,
          order: meal.order,
          blockType: meal.blockType,
          displayTitle: meal.displayTitle,
          suggestedTime: meal.suggestedTime,
          separator: meal.separator,
          daysOfWeek: meal.daysOfWeek,
          visible: meal.visible,
        },
      });

      for (const option of meal.options) {
        const newOption = await tx.mealOption.create({
          data: {
            mealId: newMeal.id,
            label: option.label,
            order: option.order,
            freeText: option.freeText,
            isStructured: option.isStructured,
          },
        });

        for (const item of option.items) {
          await tx.mealOptionItem.create({
            data: {
              mealOptionId: newOption.id,
              foodId: item.foodId,
              foodMeasureId: item.foodMeasureId,
              recipeId: item.recipeId,
              choiceGroupId: item.choiceGroupId,
              description: item.description,
              literalText: item.literalText,
              quantity: item.quantity,
              quantityMax: item.quantityMax,
              quantityText: item.quantityText,
              unit: item.unit,
              showPhoto: item.showPhoto,
              itemType: item.itemType,
              order: item.order,
            },
          });
        }
      }
    }

    return newPlan;
  });

  await logAudit({ actorUserId: actor.id, action: "CRIAR", entity: "MealPlan", entityId: result.id, clientId, metadata: { duplicadoDe: mealPlanId } });
  revalidateClient(clientId);
  return { mealPlanId: result.id };
}

export async function saveMealPlanAsTemplate(mealPlanId: string, name: string, goal?: string, description?: string) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const plan = await getMealPlanFullTree(mealPlanId);
  if (!plan) throw new Error("Plano não encontrado.");

  // Serializa só o que é compartilhável entre pacientes: foodId/recipeId/choiceGroupId/
  // foodMeasureId são ids do catálogo, válidos para qualquer paciente (5.4.5).
  const structure = {
    title: plan.title,
    objective: plan.objective,
    generalGuidelines: plan.generalGuidelines,
    initialGuidanceId: plan.initialGuidanceId,
    meals: plan.meals.map((meal) => ({
      name: meal.name,
      blockType: meal.blockType,
      displayTitle: meal.displayTitle,
      suggestedTime: meal.suggestedTime,
      separator: meal.separator,
      daysOfWeek: meal.daysOfWeek,
      visible: meal.visible,
      order: meal.order,
      options: meal.options.map((option) => ({
        label: option.label,
        freeText: option.freeText,
        isStructured: option.isStructured,
        order: option.order,
        items: option.items.map((item) => ({
          foodId: item.foodId,
          foodMeasureId: item.foodMeasureId,
          recipeId: item.recipeId,
          choiceGroupId: item.choiceGroupId,
          description: item.description,
          literalText: item.literalText,
          quantity: item.quantity,
          quantityMax: item.quantityMax,
          quantityText: item.quantityText,
          unit: item.unit,
          showPhoto: item.showPhoto,
          itemType: item.itemType,
          order: item.order,
        })),
      })),
    })),
  };

  const template = await prisma.mealPlanTemplate.create({
    data: { name, goal, description, structure, createdByUserId: actor.id },
  });

  await logAudit({ actorUserId: actor.id, action: "CRIAR", entity: "MealPlanTemplate", entityId: template.id });
  return { templateId: template.id };
}

type TemplateStructure = {
  title: string;
  objective: string | null;
  generalGuidelines: string | null;
  initialGuidanceId: string | null;
  meals: Array<{
    name: string;
    blockType: string;
    displayTitle: string | null;
    suggestedTime: string | null;
    separator: string;
    daysOfWeek: number[];
    visible: boolean;
    order: number;
    options: Array<{
      label: string;
      freeText: string;
      isStructured: boolean;
      order: number;
      items: Array<{
        foodId: string | null;
        foodMeasureId: string | null;
        recipeId: string | null;
        choiceGroupId: string | null;
        description: string | null;
        literalText: string | null;
        quantity: number | null;
        quantityMax: number | null;
        quantityText: string | null;
        unit: string | null;
        showPhoto: boolean;
        itemType: string;
        order: number;
      }>;
    }>;
  }>;
};

export async function applyTemplateToClient(templateId: string, clientId: string) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const template = await prisma.mealPlanTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Modelo não encontrado.");

  const structure = template.structure as unknown as TemplateStructure;

  const result = await prisma.$transaction(async (tx) => {
    await tx.mealPlan.updateMany({ where: { clientId, active: true }, data: { active: false, status: "SUBSTITUIDO" } });

    const newPlan = await tx.mealPlan.create({
      data: {
        clientId,
        title: structure.title,
        objective: structure.objective,
        generalGuidelines: structure.generalGuidelines,
        initialGuidanceId: structure.initialGuidanceId,
        templateId: template.id,
        status: "RASCUNHO",
        active: true,
      },
    });

    for (const meal of structure.meals) {
      const newMeal = await tx.meal.create({
        data: {
          mealPlanId: newPlan.id,
          name: meal.name,
          order: meal.order,
          blockType: meal.blockType as never,
          displayTitle: meal.displayTitle,
          suggestedTime: meal.suggestedTime,
          separator: meal.separator as never,
          daysOfWeek: meal.daysOfWeek,
          visible: meal.visible,
        },
      });

      for (const option of meal.options) {
        const newOption = await tx.mealOption.create({
          data: {
            mealId: newMeal.id,
            label: option.label,
            freeText: option.freeText,
            isStructured: option.isStructured,
            order: option.order,
          },
        });

        for (const item of option.items) {
          await tx.mealOptionItem.create({
            data: {
              mealOptionId: newOption.id,
              foodId: item.foodId,
              foodMeasureId: item.foodMeasureId,
              recipeId: item.recipeId,
              choiceGroupId: item.choiceGroupId,
              description: item.description,
              literalText: item.literalText,
              quantity: item.quantity,
              quantityMax: item.quantityMax,
              quantityText: item.quantityText,
              unit: item.unit,
              showPhoto: item.showPhoto,
              itemType: item.itemType as never,
              order: item.order,
            },
          });
        }
      }
    }

    return newPlan;
  });

  await logAudit({ actorUserId: actor.id, action: "CRIAR", entity: "MealPlan", entityId: result.id, clientId, metadata: { aplicadoDoModelo: templateId } });
  revalidateClient(clientId);
  return { mealPlanId: result.id };
}

/**
 * Materializa os totais (min/max de kcal/macros em item/opção/refeição/plano) usando o motor de
 * cálculo, e marca o plano como FINALIZADO. O PDF (Fase 5) lê só estes valores — nunca recalcula.
 */
export async function finalizeMealPlan(mealPlanId: string, clientId: string) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const plan = await getMealPlanFullTree(mealPlanId);
  if (!plan) throw new Error("Plano não encontrado.");
  if (plan.clientId !== clientId) throw new Error("Este plano não pertence a este paciente.");

  const allWarnings: Array<{ message: string; foodName?: string }> = [];

  await prisma.$transaction(async (tx) => {
    const mealResults: Array<{ separator: string; visible: boolean; result: ReturnType<typeof calcMealFromOptions> }> = [];

    for (const meal of plan.meals) {
      const optionResults = meal.options.map((option) => {
        const itemLikes: MealOptionItemLike[] = option.items.map((item) => ({
          itemType: item.itemType,
          food: item.food,
          foodMeasure: item.foodMeasure,
          recipe: item.recipe
            ? { name: item.recipe.name, servings: item.recipe.servings, ingredientItems: item.recipe.ingredientItems }
            : null,
          choiceGroup: item.choiceGroup
            ? { name: item.choiceGroup.name, quantityText: item.choiceGroup.quantityText, defaultQuantity: item.choiceGroup.defaultQuantity, defaultUnit: item.choiceGroup.defaultUnit, items: item.choiceGroup.items }
            : null,
          description: item.description,
          quantity: item.quantity,
          quantityMax: item.quantityMax,
          unit: item.unit,
          quantityText: item.quantityText,
        }));

        // materializa cada item individualmente também
        return { option, itemLikes, result: calcMealOptionFromItems(itemLikes) };
      });

      for (const { option, itemLikes } of optionResults) {
        for (let i = 0; i < option.items.length; i++) {
          const itemResult = calcMealOptionItem(itemLikes[i]);
          await tx.mealOptionItem.update({
            where: { id: option.items[i].id },
            data: {
              kcal: itemResult.range.min.kcal,
              protein: itemResult.range.min.protein,
              carbs: itemResult.range.min.carbs,
              fat: itemResult.range.min.fat,
              calcStatus: itemResult.status,
              calcNote: itemResult.warnings[0]?.message ?? null,
            },
          });
          allWarnings.push(...itemResult.warnings);
        }
      }

      for (const { option, result } of optionResults) {
        await tx.mealOption.update({
          where: { id: option.id },
          data: {
            kcalMin: result.range.min.kcal,
            kcalMax: result.range.max.kcal,
            proteinMin: result.range.min.protein,
            proteinMax: result.range.max.protein,
            carbsMin: result.range.min.carbs,
            carbsMax: result.range.max.carbs,
            fatMin: result.range.min.fat,
            fatMax: result.range.max.fat,
            calcStatus: result.status,
          },
        });
      }

      const mealResult = calcMealFromOptions(optionResults.map((o) => o.result), meal.separator);
      await tx.meal.update({
        where: { id: meal.id },
        data: { kcalMin: mealResult.range.min.kcal, kcalMax: mealResult.range.max.kcal, calcStatus: mealResult.status },
      });
      mealResults.push({ separator: meal.separator, visible: meal.visible, result: mealResult });
    }

    const dayTotal = calcDayTotal(mealResults);
    allWarnings.push(...dayTotal.warnings);

    await tx.mealPlan.update({
      where: { id: mealPlanId },
      data: {
        status: "FINALIZADO",
        kcalTotalMin: dayTotal.range.min.kcal,
        kcalTotalMax: dayTotal.range.max.kcal,
        proteinTotalMin: dayTotal.range.min.protein,
        proteinTotalMax: dayTotal.range.max.protein,
        carbsTotalMin: dayTotal.range.min.carbs,
        carbsTotalMax: dayTotal.range.max.carbs,
        fatTotalMin: dayTotal.range.min.fat,
        fatTotalMax: dayTotal.range.max.fat,
        calcStatus: dayTotal.status,
        calcWarnings: allWarnings,
      },
    });
  });

  await logAudit({ actorUserId: actor.id, action: "ATUALIZAR", entity: "MealPlan", entityId: mealPlanId, clientId, metadata: { finalizado: true } });
  revalidateClient(clientId);
}
