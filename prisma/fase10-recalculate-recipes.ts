import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeRecipeMacros } from "../src/lib/recipeCalc";

/**
 * Migração de dado da Fase 10 (5.10.1): calories/protein/carbs/fat deixam de ser campo digitado
 * e passam a ser cache materializado do RecipeIngredient. Para cada receita já existente:
 * 1. Preserva o valor digitado atual em `legacyMacrosNote`, para a Luana comparar.
 * 2. Recalcula pelo motor da Fase 3 — vira `null` (não zero) quando os ingredientes vinculados
 *    não permitem calcular, nunca herda o valor antigo sem revisão.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

function formatLegacyNote(recipe: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null }): string | null {
  if (recipe.calories == null && recipe.protein == null && recipe.carbs == null && recipe.fat == null) return null;
  const parts: string[] = [];
  if (recipe.calories != null) parts.push(`${recipe.calories} kcal`);
  if (recipe.protein != null) parts.push(`P ${recipe.protein}g`);
  if (recipe.carbs != null) parts.push(`C ${recipe.carbs}g`);
  if (recipe.fat != null) parts.push(`G ${recipe.fat}g`);
  return parts.join(" · ");
}

async function main() {
  const recipes = await prisma.recipe.findMany({ include: { ingredientItems: { include: { food: true } } } });

  let recalculated = 0;
  let becamePending = 0;

  for (const recipe of recipes) {
    const legacyNote = formatLegacyNote(recipe);
    const macros = computeRecipeMacros(recipe.name, recipe.servings, recipe.ingredientItems);

    if (macros.calories == null) becamePending++;

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { ...macros, legacyMacrosNote: legacyNote },
    });
    recalculated++;

    console.log(`${recipe.name}: ${legacyNote ?? "(sem valor digitado)"} → ${macros.calories != null ? `${macros.calories} kcal, P${macros.protein}g C${macros.carbs}g G${macros.fat}g` : "macros pendentes"}`);
  }

  console.log("\n=== Recálculo de macros de receitas concluído ===");
  console.log(`Total: ${recalculated} — ficaram com macros pendentes (ingredientes insuficientes): ${becamePending}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
