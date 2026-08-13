import Link from "next/link";
import { NewMealPlanButton } from "./NewMealPlanButton";
import { MealCard } from "./MealCard";
import { AddMealForm } from "./AddMealForm";
import type { MealView } from "./types";
import type { Food } from "@/generated/prisma/client";

type MealPlanData = {
  id: string;
  title: string;
  objective: string | null;
  generalGuidelines: string | null;
  meals: MealView[];
} | null;

export function MealPlanSection({
  clientId,
  mealPlan,
  foods,
}: {
  clientId: string;
  mealPlan: MealPlanData;
  foods: Food[];
}) {
  const guidelines = mealPlan?.generalGuidelines?.split("\n").filter(Boolean) ?? [];

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="chart-card-header">
        <h3>Plano Alimentar</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {mealPlan && (
            <Link href={`/planos/${mealPlan.id}/exportar`} className="btn btn-ghost btn-sm">
              🖨️ Exportar PDF
            </Link>
          )}
          <Link href={`/planos?clientId=${clientId}`} className="btn btn-ghost btn-sm">
            🍽️ Montar com receitas
          </Link>
          <NewMealPlanButton clientId={clientId} hasPlan={!!mealPlan} />
        </div>
      </div>

      {!mealPlan ? (
        <div className="empty-state">
          <span style={{ fontSize: "1.8rem" }}>📋</span>
          <p>Nenhum plano alimentar cadastrado ainda.</p>
        </div>
      ) : (
        <>
          {mealPlan.objective && (
            <p className="text-muted" style={{ fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text-primary)" }}>Objetivo: </strong>
              {mealPlan.objective}
            </p>
          )}

          {guidelines.length > 0 && (
            <div className="card" style={{ padding: 14, background: "var(--accent-primary-soft)", border: "none" }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Orientações gerais</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 18, listStyle: "disc" }}>
                {guidelines.map((g, i) => (
                  <li key={i} style={{ fontSize: "0.85rem" }}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mealPlan.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} clientId={clientId} foods={foods} />
            ))}
          </div>

          <AddMealForm mealPlanId={mealPlan.id} clientId={clientId} />
        </>
      )}
    </div>
  );
}
