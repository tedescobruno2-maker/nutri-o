"use client";

import { useTransition } from "react";
import { deleteMealOptionItem } from "@/actions/mealPlans";
import type { MealOptionItemView } from "./types";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function MealOptionItemChip({ item, clientId }: { item: MealOptionItemView; clientId: string }) {
  const [isPending, startTransition] = useTransition();

  const label = item.food ? item.food.name : item.recipe ? item.recipe.name : item.description || "Item";
  const qty = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null;

  const macros =
    item.food && item.quantity
      ? {
          kcal: Math.round((item.food.kcal100 * item.quantity) / 100),
          protein: round1((item.food.protein100 * item.quantity) / 100),
          carbs: round1((item.food.carbs100 * item.quantity) / 100),
          fat: round1((item.food.fat100 * item.quantity) / 100),
        }
      : null;

  return (
    <span
      className="badge badge-primary"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: isPending ? 0.5 : 1, cursor: "pointer" }}
      title={macros ? `${macros.kcal} kcal · P ${macros.protein}g · C ${macros.carbs}g · G ${macros.fat}g — clique para remover` : "Clique para remover"}
      onClick={() => startTransition(() => deleteMealOptionItem(item.id, clientId))}
    >
      {item.food?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.food.imageUrl} alt={item.food.name} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
      )}
      {qty ? `${qty} · ${label}` : label}
      {macros && <span style={{ opacity: 0.85 }}>({macros.kcal} kcal)</span>}
      {" ✕"}
    </span>
  );
}
