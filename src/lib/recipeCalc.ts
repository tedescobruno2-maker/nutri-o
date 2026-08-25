/**
 * Ponte entre RecipeIngredient (já com o Food carregado) e o motor de cálculo da Fase 3 —
 * usada para materializar o cache Recipe.calories/protein/carbs/fat ao salvar (5.10.1). Mesma
 * regra dura de sempre: nutrientStatus PENDENTE nunca entra no somatório, e "não calculável"
 * nunca vira zero.
 */
import { calcItem } from "./nutrition";
import { toFoodRef, type FoodLike } from "./mealPlanCalc";

export type RecipeIngredientForCalc = {
  food: FoodLike | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
};

export type RecipeMacros = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** Retorna null em todos os campos quando a receita não tem nenhum ingrediente calculável —
 * vira o badge "macros pendentes" na interface, nunca um zero inventado. */
export function computeRecipeMacros(name: string, servings: number | null, ingredients: RecipeIngredientForCalc[]): RecipeMacros {
  const result = calcItem({
    type: "RECEITA",
    name,
    servings,
    ingredients: ingredients.map((i) => ({
      food: i.food ? toFoodRef(i.food) : null,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
    })),
  });

  if (result.status === "NAO_CALCULAVEL") {
    return { calories: null, protein: null, carbs: null, fat: null };
  }

  return {
    calories: Math.round(result.range.min.kcal),
    protein: Math.round(result.range.min.protein * 10) / 10,
    carbs: Math.round(result.range.min.carbs * 10) / 10,
    fat: Math.round(result.range.min.fat * 10) / 10,
  };
}
