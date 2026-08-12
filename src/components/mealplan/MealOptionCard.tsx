"use client";

import { useTransition } from "react";
import { deleteMealOption } from "@/actions/mealPlans";
import { MealOptionItemChip } from "./MealOptionItemChip";
import { AddMealOptionItemForm } from "./AddMealOptionItemForm";
import type { MealOptionView } from "./types";
import type { Food } from "@/generated/prisma/client";

export function MealOptionCard({
  option,
  clientId,
  foods,
}: {
  option: MealOptionView;
  clientId: string;
  foods: Food[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="card"
      style={{ padding: 14, opacity: isPending ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span className="badge badge-info">{option.label}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => startTransition(() => deleteMealOption(option.id, clientId))}
        >
          Remover
        </button>
      </div>
      <p style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.5 }}>{option.freeText}</p>

      {option.items.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {option.items.map((item) => (
            <MealOptionItemChip key={item.id} item={item} clientId={clientId} />
          ))}
        </div>
      )}

      <AddMealOptionItemForm mealOptionId={option.id} clientId={clientId} foods={foods} />
    </div>
  );
}
