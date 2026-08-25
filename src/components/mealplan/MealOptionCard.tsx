"use client";

import { useState, useTransition } from "react";
import { deleteMealOption, attachMealOptionImage } from "@/actions/mealPlans";
import { MealOptionItemChip } from "./MealOptionItemChip";
import { AddMealOptionItemForm } from "./AddMealOptionItemForm";
import { ImagePicker } from "@/components/images/ImagePicker";
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
  const [showPicker, setShowPicker] = useState(false);

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

      {/* 5.10.3 — foto opcional para combinação livre de alimentos (não é receita cadastrada).
          Nunca sugerida automaticamente: sem termo pré-preenchido. */}
      {!option.isStructured && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {option.imageAsset ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={option.imageAsset.thumbUrl ?? option.imageAsset.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowPicker(true)}>Trocar foto</button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => startTransition(() => attachMealOptionImage(option.id, null, clientId))}
              >
                Remover foto
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowPicker(true)}>
              📷 Buscar foto para esta combinação
            </button>
          )}
        </div>
      )}
      {showPicker && (
        <ImagePicker
          suggestedTerm=""
          altTextDefault={option.freeText.slice(0, 60)}
          onSelect={(asset) => {
            startTransition(async () => {
              await attachMealOptionImage(option.id, asset.id, clientId);
              setShowPicker(false);
            });
          }}
          onClose={() => setShowPicker(false)}
        />
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
