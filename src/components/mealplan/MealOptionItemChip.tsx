"use client";

import { useTransition } from "react";
import { deleteMealOptionItem } from "@/actions/mealPlans";
import { calcItem } from "@/lib/nutrition";
import type { MealOptionItemView } from "./types";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function MealOptionItemChip({ item, clientId }: { item: MealOptionItemView; clientId: string }) {
  const [isPending, startTransition] = useTransition();

  const label = item.food ? item.food.name : item.recipe ? item.recipe.name : item.description || "Item";
  const qty = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null;

  // Motor de cálculo centralizado (Fase 3) — nunca multiplica kcal100 aqui.
  const result =
    item.food && item.quantity
      ? calcItem({
          type: "ALIMENTO",
          food: {
            name: item.food.name,
            kcal100: item.food.kcal100,
            protein100: item.food.protein100,
            carbs100: item.food.carbs100,
            fat100: item.food.fat100,
            fiber100: item.food.fiber100,
            nutrientStatus: item.food.nutrientStatus,
          },
          quantity: item.quantity,
          unit: item.unit,
        })
      : null;

  const macros =
    result && result.status === "CALCULADO"
      ? {
          kcal: Math.round(result.range.min.kcal),
          protein: round1(result.range.min.protein),
          carbs: round1(result.range.min.carbs),
          fat: round1(result.range.min.fat),
        }
      : null;

  const pendingTitle = result?.warnings[0]?.message;

  return (
    <span
      className="badge badge-primary"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: isPending ? 0.5 : 1, cursor: "pointer" }}
      title={
        macros
          ? `${macros.kcal} kcal · P ${macros.protein}g · C ${macros.carbs}g · G ${macros.fat}g — clique para remover`
          : pendingTitle
            ? `${pendingTitle} — clique para remover`
            : "Clique para remover"
      }
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
