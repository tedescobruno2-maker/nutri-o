import Link from "next/link";
import { NewMealPlanButton } from "./NewMealPlanButton";
import { MealCard } from "./MealCard";
import { AddMealForm } from "./AddMealForm";
import { PlanActionsBar } from "./PlanActionsBar";
import { MealPlanReferenceSection } from "./MealPlanReferenceSection";
import { calcDayTotal, calcMealFromOptions, calcMealOptionFromItems } from "@/lib/mealPlanCalc";
import { listAllRestrictions, type ClientRestrictions } from "@/lib/allergyMatch";
import { CALC_STATUS_LABELS } from "@/lib/utils";
import type { MealView, RecipeView, ChoiceGroupView } from "./types";
import type { Food, FoodMeasure, GuidanceText, Consultation, Measurement, MealPlanTemplate } from "@/generated/prisma/client";

type MealPlanData = {
  id: string;
  title: string;
  objective: string | null;
  generalGuidelines: string | null;
  status: string;
  consultationId: string | null;
  initialGuidanceId: string | null;
  meals: MealView[];
} | null;

export function MealPlanSection({
  clientId,
  client,
  mealPlan,
  foods,
  recipes,
  choiceGroups,
  guidanceTexts,
  templates,
}: {
  clientId: string;
  client: ClientRestrictions & { consultations: Consultation[]; measurements: Measurement[] };
  mealPlan: MealPlanData;
  foods: Array<Food & { measures: FoodMeasure[] }>;
  recipes: RecipeView[];
  choiceGroups: ChoiceGroupView[];
  guidanceTexts: GuidanceText[];
  templates: MealPlanTemplate[];
}) {
  const guidelines = mealPlan?.generalGuidelines?.split("\n").filter(Boolean) ?? [];
  const restrictions = listAllRestrictions(client);

  const dayTotal = mealPlan
    ? calcDayTotal(
        mealPlan.meals.map((meal) => {
          const optionResults = meal.options.map((o) => calcMealOptionFromItems(o.items));
          return { separator: meal.separator, visible: meal.visible, result: calcMealFromOptions(optionResults, meal.separator) };
        })
      )
    : null;

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

      {restrictions.length > 0 && (
        <div
          style={{
            background: "color-mix(in oklch, var(--danger) 12%, transparent)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <strong style={{ color: "var(--danger)", fontSize: "0.85rem" }}>⚠ Restrições cadastradas:</strong>
          {restrictions.map((r, i) => (
            <span key={i} className="badge" style={{ background: "var(--danger)", color: "white", fontSize: "0.76rem" }}>
              {r.term}
            </span>
          ))}
        </div>
      )}

      {!mealPlan ? (
        <div className="empty-state">
          <span style={{ fontSize: "1.8rem" }}>📋</span>
          <p>Nenhum plano alimentar cadastrado ainda.</p>
        </div>
      ) : (
        <>
          {dayTotal && (
            <div className="card" style={{ padding: 14, background: "var(--accent-primary-soft)", border: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <p className="eyebrow">Total do dia (estimativa considerando a 1ª opção de cada refeição)</p>
                  <p style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                    {dayTotal.range.min.kcal === dayTotal.range.max.kcal
                      ? `${Math.round(dayTotal.range.min.kcal)} kcal`
                      : `${Math.round(dayTotal.range.min.kcal)}–${Math.round(dayTotal.range.max.kcal)} kcal`}
                  </p>
                  <p className="text-muted" style={{ fontSize: "0.82rem" }}>
                    P {Math.round(dayTotal.range.min.protein)}g · C {Math.round(dayTotal.range.min.carbs)}g · G {Math.round(dayTotal.range.min.fat)}g
                    {" · "}
                    <span className="text-tertiary">{CALC_STATUS_LABELS[dayTotal.status] ?? dayTotal.status}</span>
                  </p>
                </div>
                <PlanActionsBar mealPlanId={mealPlan.id} clientId={clientId} status={mealPlan.status} templates={templates} />
              </div>
              {dayTotal.warnings.length > 0 && (
                <details>
                  <summary className="text-tertiary" style={{ fontSize: "0.78rem", cursor: "pointer" }}>
                    ⚠ {dayTotal.warnings.length} item(ns) fora do somatório
                  </summary>
                  <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                    {dayTotal.warnings.map((w, i) => (
                      <li key={i} style={{ fontSize: "0.78rem" }}>{w.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <MealPlanReferenceSection
            mealPlanId={mealPlan.id}
            clientId={clientId}
            consultations={client.consultations}
            measurements={client.measurements}
            guidanceTexts={guidanceTexts}
            consultationId={mealPlan.consultationId}
            initialGuidanceId={mealPlan.initialGuidanceId}
          />

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
              <MealCard key={meal.id} meal={meal} clientId={clientId} mealPlanId={mealPlan.id} foods={foods} recipes={recipes} choiceGroups={choiceGroups} guidanceTexts={guidanceTexts} />
            ))}
          </div>

          <AddMealForm mealPlanId={mealPlan.id} clientId={clientId} />
        </>
      )}
    </div>
  );
}
