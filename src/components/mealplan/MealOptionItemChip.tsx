"use client";

import { useTransition } from "react";
import { deleteMealOptionItem } from "@/actions/mealPlans";
import { calcMealOptionItem, itemToItemInput } from "@/lib/mealPlanCalc";
import type { MealOptionItemView } from "./types";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function itemLabel(item: MealOptionItemView): string {
  if (item.food) return item.food.name;
  if (item.recipe) return item.recipe.name;
  if (item.choiceGroup) return item.choiceGroup.name;
  return item.description || item.literalText || "Item";
}

export function MealOptionItemChip({ item, clientId }: { item: MealOptionItemView; clientId: string }) {
  const [isPending, startTransition] = useTransition();

  const label = itemLabel(item);
  const qty = item.quantity ? `${item.quantity}${item.quantityMax ? `–${item.quantityMax}` : ""}${item.unit ? ` ${item.unit}` : ""}` : item.quantityText ? item.quantityText : null;

  const input = itemToItemInput(item);
  const result = input ? calcMealOptionItem(item) : null;

  const macros =
    result && (result.status === "CALCULADO" || result.status === "FAIXA")
      ? {
          kcalMin: Math.round(result.range.min.kcal),
          kcalMax: Math.round(result.range.max.kcal),
          protein: round1(result.range.min.protein),
          carbs: round1(result.range.min.carbs),
          fat: round1(result.range.min.fat),
        }
      : null;

  const warningTitle = result?.warnings[0]?.message;
  const kcalLabel = macros ? (macros.kcalMin === macros.kcalMax ? `${macros.kcalMin} kcal` : `${macros.kcalMin}–${macros.kcalMax} kcal`) : null;

  return (
    <span
      className="badge badge-primary"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: isPending ? 0.5 : 1, cursor: "pointer" }}
      title={
        macros
          ? `${kcalLabel} · P ${macros.protein}g · C ${macros.carbs}g · G ${macros.fat}g — clique para remover`
          : warningTitle
            ? `${warningTitle} — clique para remover`
            : "Clique para remover"
      }
      onClick={() => startTransition(() => deleteMealOptionItem(item.id, clientId))}
    >
      {item.food?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.food.imageUrl} alt={item.food.name} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
      )}
      {item.itemType === "GRUPO_ESCOLHA" && "⊘ "}
      {qty ? `${qty} · ${label}` : label}
      {kcalLabel && <span style={{ opacity: 0.85 }}>({kcalLabel})</span>}
      {!macros && item.itemType !== "TEXTO_LIVRE" && <span style={{ opacity: 0.7 }}>⚠</span>}
      {" ✕"}
    </span>
  );
}
