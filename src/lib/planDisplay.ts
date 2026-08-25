/**
 * Formatação compartilhada entre a pré-visualização web (`/planos/[id]/exportar`) e o PDF real
 * (Fase 5) — só texto/rótulo, nenhum cálculo de kcal aqui (isso é sempre `nutrition.ts`/
 * `mealPlanCalc.ts`). Mantém as duas saídas (5.5.1) mostrando exatamente os mesmos números.
 */
import { calcMealOptionItem, itemToItemInput, type MealOptionItemLike } from "./mealPlanCalc";

export function itemDisplayLabel(item: MealOptionItemLike): string {
  if (item.food) return item.food.name;
  if (item.recipe) return item.recipe.name;
  if (item.choiceGroup) return item.choiceGroup.name;
  return item.description ?? "";
}

export function itemQuantityLabel(item: MealOptionItemLike): string | null {
  if (item.quantityText) return item.quantityText;
  if (item.foodMeasure && item.quantity != null) {
    return `${item.quantity} ${item.foodMeasure.label}`;
  }
  if (item.quantity != null) {
    const unit = item.unit ?? "g";
    return item.quantityMax != null ? `${item.quantity} a ${item.quantityMax} ${unit}` : `${item.quantity} ${unit}`;
  }
  return null;
}

export function itemKcalLabel(item: MealOptionItemLike): string | null {
  const input = itemToItemInput(item);
  if (!input) return null;
  const result = calcMealOptionItem(item);
  if (result.status !== "CALCULADO" && result.status !== "FAIXA") return null;
  const { min, max } = result.range;
  return min.kcal === max.kcal ? `${Math.round(min.kcal)} kcal` : `${Math.round(min.kcal)}–${Math.round(max.kcal)} kcal`;
}

export function itemIsPending(item: MealOptionItemLike): boolean {
  return item.food != null && item.food.nutrientStatus === "PENDENTE";
}

/** "PlanoAlimentar_JoaoDaSilva_2026-08-25.pdf" — sem acento, sem espaço (5.5.2). */
export function mealPlanPdfFileName(clientName: string, date: Date): string {
  const noAccents = clientName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  const iso = date.toISOString().slice(0, 10);
  return `PlanoAlimentar_${noAccents}_${iso}.pdf`;
}
