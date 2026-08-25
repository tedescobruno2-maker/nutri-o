"use client";

import { useTransition } from "react";
import { deleteMealOption } from "@/actions/mealPlans";
import { MealOptionItemChip } from "./MealOptionItemChip";
import { AddMealOptionItemForm } from "./AddMealOptionItemForm";
import { calcMealOptionFromItems } from "@/lib/mealPlanCalc";
import type { MealOptionView, RecipeView, ChoiceGroupView } from "./types";
import type { Food, FoodMeasure, GuidanceText } from "@/generated/prisma/client";

export function MealOptionCard({
  option,
  clientId,
  foods,
  recipes,
  choiceGroups,
  guidanceTexts,
}: {
  option: MealOptionView;
  clientId: string;
  foods: Array<Food & { measures: FoodMeasure[] }>;
  recipes: RecipeView[];
  choiceGroups: ChoiceGroupView[];
  guidanceTexts: GuidanceText[];
}) {
  const [isPending, startTransition] = useTransition();

  const result = calcMealOptionFromItems(option.items);
  const hasRange = result.range.min.kcal !== result.range.max.kcal;
  const kcalLabel =
    option.items.length === 0
      ? null
      : hasRange
        ? `${Math.round(result.range.min.kcal)}–${Math.round(result.range.max.kcal)} kcal`
        : `${Math.round(result.range.min.kcal)} kcal`;

  return (
    <div
      className="card"
      style={{ padding: 14, opacity: isPending ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-info">{option.label}</span>
          {kcalLabel && <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>{kcalLabel}</span>}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => startTransition(() => deleteMealOption(option.id, clientId))}
        >
          Remover
        </button>
      </div>
      {!option.isStructured && option.freeText && (
        <p style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.5 }}>{option.freeText}</p>
      )}

      {option.items.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {option.items.map((item) => (
            <MealOptionItemChip key={item.id} item={item} clientId={clientId} />
          ))}
        </div>
      )}

      <AddMealOptionItemForm mealOptionId={option.id} clientId={clientId} foods={foods} recipes={recipes} choiceGroups={choiceGroups} guidanceTexts={guidanceTexts} />
    </div>
  );
}
