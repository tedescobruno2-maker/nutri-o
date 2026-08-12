"use client";

import { useTransition } from "react";
import { deleteMealOptionItem } from "@/actions/mealPlans";
import type { MealOptionItemView } from "./types";

export function MealOptionItemChip({ item, clientId }: { item: MealOptionItemView; clientId: string }) {
  const [isPending, startTransition] = useTransition();

  const label = item.food
    ? item.food.name
    : item.recipe
      ? item.recipe.name
      : item.description || "Item";

  const qty = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null;

  return (
    <span
      className="badge badge-primary"
      style={{ opacity: isPending ? 0.5 : 1, cursor: "pointer" }}
      title="Clique para remover"
      onClick={() => startTransition(() => deleteMealOptionItem(item.id, clientId))}
    >
      {qty ? `${qty} · ${label}` : label} ✕
    </span>
  );
}
