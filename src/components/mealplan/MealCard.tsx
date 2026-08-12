"use client";

import { useTransition } from "react";
import { deleteMeal } from "@/actions/mealPlans";
import { MealOptionCard } from "./MealOptionCard";
import { AddMealOptionForm } from "./AddMealOptionForm";
import type { MealView } from "./types";
import type { Food } from "@/generated/prisma/client";

export function MealCard({ meal, clientId, foods }: { meal: MealView; clientId: string; foods: Food[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card card-pad" style={{ opacity: isPending ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>{meal.name}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => startTransition(() => deleteMeal(meal.id, clientId))}
        >
          Remover refeição
        </button>
      </div>

      {meal.options.map((option) => (
        <MealOptionCard key={option.id} option={option} clientId={clientId} foods={foods} />
      ))}

      <AddMealOptionForm mealId={meal.id} clientId={clientId} nextLabel={`Opção ${meal.options.length + 1}`} />
    </div>
  );
}
