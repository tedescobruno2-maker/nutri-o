/**
 * Ponte entre os dados carregados do banco (Food/FoodMeasure/Recipe/ChoiceGroup já incluídos num
 * MealOptionItem) e os tipos de entrada puros do motor de cálculo (`src/lib/nutrition.ts`). Fica
 * separado de `nutrition.ts` de propósito: o motor continua sem saber nada sobre a forma exata dos
 * dados do Prisma, e este arquivo pode ser usado tanto no cliente (contador ao vivo) quanto no
 * servidor (materialização no "Finalizar") — não importa `prisma` nem `server-only`.
 */
import { calcItem, calcOption, calcMeal, calcPlan, type ItemInput, type FoodRef, type CalcResult, type BlockSeparator, type MealInput } from "./nutrition";

export type FoodLike = {
  name: string;
  kcal100: number | null;
  protein100: number | null;
  carbs100: number | null;
  fat100: number | null;
  fiber100: number | null;
  nutrientStatus: string;
  imageUrl?: string | null;
};

export type MealOptionItemLike = {
  itemType: string;
  food: FoodLike | null;
  foodMeasure: { label: string; grams: number } | null;
  recipe: {
    name: string;
    servings: number | null;
    imageUrl?: string | null;
    ingredientItems: Array<{ food: FoodLike | null; description: string | null; quantity: number | null; unit: string | null }>;
  } | null;
  choiceGroup: {
    name: string;
    quantityText: string | null;
    defaultQuantity: number | null;
    defaultUnit: string | null;
    items: Array<{ food: FoodLike | null; description: string | null; quantity: number | null; unit: string | null }>;
  } | null;
  description: string | null;
  quantity: number | null;
  quantityMax: number | null;
  unit: string | null;
  quantityText: string | null;
};

export function toFoodRef(food: FoodLike): FoodRef {
  return {
    name: food.name,
    kcal100: food.kcal100,
    protein100: food.protein100,
    carbs100: food.carbs100,
    fat100: food.fat100,
    fiber100: food.fiber100,
    nutrientStatus: food.nutrientStatus === "PENDENTE" ? "PENDENTE" : "VALIDADO",
  };
}

/** Converte um `MealOptionItem` (com suas relações carregadas) no `ItemInput` do motor. */
export function itemToItemInput(item: MealOptionItemLike): ItemInput | null {
  switch (item.itemType) {
    case "ALIMENTO": {
      if (!item.food) return null;
      return {
        type: "ALIMENTO",
        food: toFoodRef(item.food),
        quantity: item.quantity,
        quantityMax: item.quantityMax,
        unit: item.unit,
        measure: item.foodMeasure ? { label: item.foodMeasure.label, grams: item.foodMeasure.grams } : null,
        quantityText: item.quantityText,
      };
    }
    case "RECEITA": {
      if (!item.recipe) return null;
      return {
        type: "RECEITA",
        name: item.recipe.name,
        servings: item.recipe.servings,
        ingredients: item.recipe.ingredientItems.map((ing) => ({
          food: ing.food ? toFoodRef(ing.food) : null,
          description: ing.description,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      };
    }
    case "GRUPO_ESCOLHA": {
      if (!item.choiceGroup) return null;
      return {
        type: "GRUPO_ESCOLHA",
        name: item.choiceGroup.name,
        quantityText: item.choiceGroup.quantityText,
        options: item.choiceGroup.items.map((opt) => ({
          food: opt.food ? toFoodRef(opt.food) : null,
          description: opt.description,
          quantity: opt.quantity ?? item.choiceGroup!.defaultQuantity,
          unit: opt.unit ?? item.choiceGroup!.defaultUnit,
        })),
      };
    }
    case "SUPLEMENTO":
      return { type: "SUPLEMENTO" };
    case "TEXTO_LIVRE":
    default:
      return { type: "TEXTO_LIVRE" };
  }
}

export function calcMealOptionItem(item: MealOptionItemLike): CalcResult {
  const input = itemToItemInput(item);
  if (!input) return { range: { min: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, max: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }, status: "NAO_CALCULAVEL", warnings: [] };
  return calcItem(input);
}

export function calcMealOptionFromItems(items: MealOptionItemLike[]): CalcResult {
  const inputs = items.map(itemToItemInput).filter((i): i is ItemInput => i != null);
  return calcOption(inputs);
}

export function calcMealFromOptions(optionResults: CalcResult[], separator: string): CalcResult {
  return calcMeal(optionResults, separator === "LISTA" ? "LISTA" : "OU");
}

export function calcDayTotal(meals: Array<{ separator: string; visible: boolean; result: CalcResult }>): CalcResult {
  const inputs: MealInput[] = meals.map((m) => ({
    separator: (m.separator === "LISTA" ? "LISTA" : "OU") as BlockSeparator,
    visible: m.visible,
    result: m.result,
  }));
  return calcPlan(inputs);
}
