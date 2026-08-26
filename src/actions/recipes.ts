"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { computeRecipeMacros } from "@/lib/recipeCalc";

/** Enquanto os componentes que exibem foto de receita (PDF, pré-visualização do plano, cartão
 * de receita) ainda leem `imageUrl` diretamente, toda vez que um `imageAssetId` é gravado o
 * `imageUrl` legado é sincronizado com a mesma URL — evita ter que atualizar cada consumidor
 * agora, e continua compatível com a Fase 11, que apaga o campo legado quando ele não for mais
 * necessário em lugar nenhum. */
async function legacyImageUrl(imageAssetId: string | undefined) {
  if (!imageAssetId) return {};
  const asset = await prisma.imageAsset.findUnique({ where: { id: imageAssetId } });
  return asset ? { imageUrl: asset.url } : {};
}

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
  servings: z.coerce.number().int().positive().optional(),
  prepTimeMin: z.coerce.number().int().positive().optional(),
  mealCategory: z.string().optional(),
  isExtra: z.coerce.boolean().optional(),
  imageAssetId: z.string().optional(),
  tags: z.string().optional(),
  mealSlots: z.string().optional(),
});

/** Fase 10 (5.10.1): calories/protein/carbs/fat deixaram de ser campo digitado — são cache
 * materializado, recalculado aqui a partir do RecipeIngredient pelo motor da Fase 3. */
export async function createRecipe(formData: FormData) {
  const parsed = createRecipeSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    ingredients: formData.get("ingredients"),
    instructions: formData.get("instructions") || undefined,
    servings: formData.get("servings") || undefined,
    prepTimeMin: formData.get("prepTimeMin") || undefined,
    mealCategory: formData.get("mealCategory") || undefined,
    isExtra: formData.get("isExtra") === "on" || undefined,
    imageAssetId: formData.get("imageAssetId") || undefined,
    tags: formData.get("tags") || undefined,
    mealSlots: formData.get("mealSlots") || undefined,
  });

  const itemsJson = formData.get("ingredientItemsJson") as string | null;
  const items = itemsJson ? ingredientItemSchema.array().parse(JSON.parse(itemsJson)) : [];
  const validItems = items.filter((item) => item.foodId || item.description);

  const recipe = await prisma.recipe.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
      servings: parsed.servings,
      prepTimeMin: parsed.prepTimeMin,
      mealCategory: parsed.mealCategory,
      isExtra: parsed.isExtra ?? false,
      imageAssetId: parsed.imageAssetId,
      ...(await legacyImageUrl(parsed.imageAssetId)),
      tags: parsed.tags,
      mealSlots: parsed.mealSlots,
      ingredientItems: {
        create: validItems.map((item, index) => ({ ...item, order: index })),
      },
    },
    include: { ingredientItems: { include: { food: true } } },
  });

  const macros = computeRecipeMacros(recipe.name, recipe.servings, recipe.ingredientItems);
  await prisma.recipe.update({ where: { id: recipe.id }, data: macros });

  revalidatePath("/recipes");
  revalidatePath("/");

  return { id: recipe.id, name: recipe.name, hasImage: !!recipe.imageAssetId };
}

const updateRecipeSchema = createRecipeSchema.extend({ id: z.string().min(1) });

/** Edição (Fase 2 da reorganização do Plano Alimentar — antes não existia edição de receita
 * nenhuma). Ao contrário de createRecipe, aqui um campo deixado em branco precisa LIMPAR o valor
 * anterior (?? null), não deixar como estava — por isso não reaproveita undefined-on-empty do
 * schema de criação direto no data do update. Ingredientes são substituídos por inteiro
 * (deleteMany + create) e as macros recalculadas de novo, mesmo padrão de createRecipe. */
export async function updateRecipe(formData: FormData) {
  const parsed = updateRecipeSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    ingredients: formData.get("ingredients"),
    instructions: formData.get("instructions") || undefined,
    servings: formData.get("servings") || undefined,
    prepTimeMin: formData.get("prepTimeMin") || undefined,
    mealCategory: formData.get("mealCategory") || undefined,
    isExtra: formData.get("isExtra") === "on" || undefined,
    imageAssetId: formData.get("imageAssetId") || undefined,
    tags: formData.get("tags") || undefined,
    mealSlots: formData.get("mealSlots") || undefined,
  });

  const itemsJson = formData.get("ingredientItemsJson") as string | null;
  const items = itemsJson ? ingredientItemSchema.array().parse(JSON.parse(itemsJson)) : [];
  const validItems = items.filter((item) => item.foodId || item.description);

  const recipe = await prisma.recipe.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      description: parsed.description ?? null,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions ?? null,
      servings: parsed.servings ?? null,
      prepTimeMin: parsed.prepTimeMin ?? null,
      mealCategory: parsed.mealCategory ?? null,
      isExtra: parsed.isExtra ?? false,
      ...(parsed.imageAssetId ? { imageAssetId: parsed.imageAssetId, ...(await legacyImageUrl(parsed.imageAssetId)) } : {}),
      tags: parsed.tags ?? null,
      mealSlots: parsed.mealSlots ?? null,
      ingredientItems: {
        deleteMany: {},
        create: validItems.map((item, index) => ({ ...item, order: index })),
      },
    },
    include: { ingredientItems: { include: { food: true } } },
  });

  const macros = computeRecipeMacros(recipe.name, recipe.servings, recipe.ingredientItems);
  await prisma.recipe.update({ where: { id: recipe.id }, data: macros });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipe.id}`);
  revalidatePath("/");

  return { id: recipe.id, name: recipe.name };
}

/** 5.10.3 — quando a receita é salva sem foto, o <ImagePicker /> abre em seguida com o termo
 * sugerido; esta ação liga a imagem escolhida à receita já criada. */
export async function attachRecipeImage(recipeId: string, imageAssetId: string) {
  await prisma.recipe.update({ where: { id: recipeId }, data: { imageAssetId, ...(await legacyImageUrl(imageAssetId)) } });
  revalidatePath("/recipes");
}

export async function deleteRecipe(recipeId: string) {
  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath("/recipes");
  revalidatePath("/");
}
