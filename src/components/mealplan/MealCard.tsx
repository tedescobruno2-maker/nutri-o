"use client";

import { useState, useTransition } from "react";
import { deleteMeal, updateMeal, moveMeal } from "@/actions/mealPlans";
import { MealOptionCard } from "./MealOptionCard";
import { AddMealOptionForm } from "./AddMealOptionForm";
import { calcMealFromOptions, calcMealOptionFromItems } from "@/lib/mealPlanCalc";
import { MEAL_BLOCK_TYPE_LABELS } from "@/lib/utils";
import type { MealView, RecipeView, ChoiceGroupView } from "./types";
import type { Food, FoodMeasure, GuidanceText } from "@/generated/prisma/client";

export function MealCard({
  meal,
  clientId,
  mealPlanId,
  foods,
  recipes,
  choiceGroups,
  guidanceTexts,
}: {
  meal: MealView;
  clientId: string;
  mealPlanId: string;
  foods: Array<Food & { measures: FoodMeasure[] }>;
  recipes: RecipeView[];
  choiceGroups: ChoiceGroupView[];
  guidanceTexts: GuidanceText[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(meal.displayTitle ?? meal.name);

  const optionResults = meal.options.map((o) => calcMealOptionFromItems(o.items));
  const mealResult = calcMealFromOptions(optionResults, meal.separator);
  const hasRange = mealResult.range.min.kcal !== mealResult.range.max.kcal;
  const kcalLabel =
    meal.options.length === 0
      ? null
      : hasRange
        ? `${Math.round(mealResult.range.min.kcal)}–${Math.round(mealResult.range.max.kcal)} kcal`
        : `${Math.round(mealResult.range.min.kcal)} kcal`;

  return (
    <div
      className="card card-pad"
      style={{ opacity: (isPending ? 0.5 : 1) * (meal.visible ? 1 : 0.6), display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {editingTitle ? (
            <input
              className="input"
              style={{ width: 220 }}
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                startTransition(() => updateMeal(meal.id, clientId, { displayTitle: titleDraft || null }));
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <h3 style={{ cursor: "text" }} onClick={() => setEditingTitle(true)} title="Clique para renomear">
              {meal.displayTitle || meal.name}
            </h3>
          )}
          <span className="text-tertiary" style={{ fontSize: "0.76rem" }}>{MEAL_BLOCK_TYPE_LABELS[meal.blockType] ?? meal.blockType}</span>
          {kcalLabel && <span className="badge badge-info">{kcalLabel}</span>}
          {!meal.visible && <span className="text-tertiary" style={{ fontSize: "0.76rem" }}>(oculto)</span>}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button type="button" className="btn btn-ghost btn-icon" title="Mover para cima" onClick={() => startTransition(() => moveMeal(mealPlanId, clientId, meal.id, "up"))}>↑</button>
          <button type="button" className="btn btn-ghost btn-icon" title="Mover para baixo" onClick={() => startTransition(() => moveMeal(mealPlanId, clientId, meal.id, "down"))}>↓</button>
          <select
            className="input"
            style={{ width: 130, fontSize: "0.78rem" }}
            value={meal.separator}
            onChange={(e) => startTransition(() => updateMeal(meal.id, clientId, { separator: e.target.value as "OU" | "LISTA" }))}
            title="OU = opções alternativas · LISTA = itens cumulativos (ex: tarefas iniciais)"
          >
            <option value="OU">Opções (OU)</option>
            <option value="LISTA">Lista cumulativa</option>
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => updateMeal(meal.id, clientId, { visible: !meal.visible }))}
          >
            {meal.visible ? "Ocultar" : "Mostrar"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => deleteMeal(meal.id, clientId))}
          >
            Remover
          </button>
        </div>
      </div>

      {meal.options.map((option) => (
        <MealOptionCard key={option.id} option={option} clientId={clientId} foods={foods} recipes={recipes} choiceGroups={choiceGroups} guidanceTexts={guidanceTexts} />
      ))}

      <AddMealOptionForm mealId={meal.id} clientId={clientId} nextLabel={`Opção ${meal.options.length + 1}`} />
    </div>
  );
}
