import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getMealPlanForEditor,
  getFoodsForBuilder,
  getFoodsGrouped,
  getRecipesWithIngredients,
  getChoiceGroupsForBuilder,
  getGuidanceTexts,
  getMealPlanTemplates,
  getSupplementCatalog,
} from "@/lib/dal";
import { MealPlanSection } from "@/components/mealplan/MealPlanSection";
import { PlanCatalogPanel } from "@/components/planbuilder/PlanCatalogPanel";
import { initials } from "@/lib/utils";

export default async function PlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mealPlan, foodsForBuilder, foodGroups, recipesWithIngredients, choiceGroups, guidanceTexts, mealPlanTemplates, supplementCatalog] = await Promise.all([
    getMealPlanForEditor(id),
    getFoodsForBuilder(),
    getFoodsGrouped(),
    getRecipesWithIngredients(),
    getChoiceGroupsForBuilder(),
    getGuidanceTexts(),
    getMealPlanTemplates(),
    getSupplementCatalog(),
  ]);
  if (!mealPlan) notFound();

  const { client, ...planData } = mealPlan;

  return (
    <div className="animate-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/planos" className="btn btn-ghost btn-sm">
          ← Trocar de paciente
        </Link>
        <Link href={`/clients/${client.id}`} className="btn btn-ghost btn-sm">
          <span className="avatar" style={{ width: 22, height: 22, fontSize: "0.68rem" }}>{initials(client.name)}</span>
          {client.name}
        </Link>
      </div>

      <section className="section">
        <MealPlanSection
          clientId={client.id}
          client={{
            allergies: client.allergies,
            intolerances: client.intolerances,
            dietaryRestrictions: client.dietaryRestrictions,
            foodAversions: client.foodAversions,
            consultations: client.consultations,
            measurements: client.measurements,
          }}
          mealPlan={planData}
          foods={foodsForBuilder}
          recipes={recipesWithIngredients}
          choiceGroups={choiceGroups}
          guidanceTexts={guidanceTexts}
          templates={mealPlanTemplates}
        />
      </section>

      <section className="section">
        <PlanCatalogPanel
          foodGroups={foodGroups}
          foods={foodsForBuilder}
          recipes={recipesWithIngredients}
          texts={guidanceTexts}
          supplementCatalog={supplementCatalog}
        />
      </section>
    </div>
  );
}
