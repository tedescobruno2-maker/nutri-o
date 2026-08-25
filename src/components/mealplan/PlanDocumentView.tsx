import { itemDisplayLabel, itemQuantityLabel, itemKcalLabel, itemIsPending } from "@/lib/planDisplay";
import { MEAL_BLOCK_TYPE_LABELS, formatDate } from "@/lib/utils";
import type { MealOptionItemLike } from "@/lib/mealPlanCalc";

/**
 * Corpo visual do plano alimentar em HTML — compartilhado entre a pré-visualização/impressão da
 * nutricionista (`/planos/[id]/exportar`) e a tela do paciente no portal (`/portal/plano`, Fase 8).
 * Mantém as duas saídas mostrando exatamente o mesmo documento (5.5.1).
 */

type PlanMealOption = {
  id: string;
  label: string;
  isStructured: boolean;
  freeText: string;
  items: unknown[];
};

type PlanMeal = {
  id: string;
  name: string;
  displayTitle: string | null;
  blockType: string;
  separator: string;
  visible: boolean;
  options: PlanMealOption[];
};

export type PlanDocumentViewProps = {
  title: string;
  clientName: string;
  clientGoal: string | null;
  clientAge: number | null;
  weight: number | null;
  consultationDate: Date | null;
  objective: string | null;
  initialGuidanceText: string | null;
  generalGuidelines: string | null;
  meals: PlanMeal[];
  generatedAtLabel: string;
  settings: {
    logoUrl: string | null;
    nutritionistName: string;
    crn: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    instagram: string | null;
  };
};

export function PlanDocumentView({
  title,
  clientName,
  clientGoal,
  clientAge,
  weight,
  consultationDate,
  objective,
  initialGuidanceText,
  generalGuidelines,
  meals,
  generatedAtLabel,
  settings,
}: PlanDocumentViewProps) {
  const visibleMeals = meals.filter((m) => m.visible);

  return (
    <div className="plan-document">
      <header className="plan-doc-header">
        <div>
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.nutritionistName} style={{ height: 32, marginBottom: 6, objectFit: "contain" }} />
          ) : (
            <div className="eyebrow">Nutri Luana Gois</div>
          )}
          <h1>{title}</h1>
          <p className="text-muted">{settings.nutritionistName} — Nutricionista · CRN {settings.crn}</p>
        </div>
        <div className="plan-doc-date text-tertiary">{generatedAtLabel}</div>
      </header>

      <section className="plan-doc-client">
        <div>
          <div className="eyebrow">Paciente</div>
          <h2>{clientName}</h2>
        </div>
        <div className="plan-doc-client-meta">
          {clientAge != null && <span>{clientAge} anos</span>}
          {weight != null && <span>Peso no dia da consulta: {weight} kg</span>}
          {consultationDate && <span>Consulta: {formatDate(consultationDate)}</span>}
          {clientGoal && <span>{clientGoal}</span>}
        </div>
      </section>

      {objective && (
        <p className="plan-doc-objective">
          <strong>Objetivo: </strong>
          {objective}
        </p>
      )}

      {initialGuidanceText && <p className="plan-doc-objective">{initialGuidanceText}</p>}

      {visibleMeals.map((meal) => (
        <section key={meal.id} className="plan-doc-meal">
          <h3>
            {(
              meal.displayTitle ||
              // blockType=LIVRE é o default de migração para refeições antigas (pré-Fase 4) —
              // nesse caso o nome original digitado (meal.name) é mais informativo que o
              // rótulo genérico "Bloco livre" (mesmo ajuste feito no PDF real).
              (meal.blockType !== "LIVRE" ? MEAL_BLOCK_TYPE_LABELS[meal.blockType] : null) ||
              meal.name
            ).toUpperCase()}
          </h3>

          {meal.separator === "LISTA" ? (
            <ul style={{ paddingLeft: 18, listStyle: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
              {meal.options.map((option) =>
                option.isStructured
                  ? option.items.map((item, i) => (
                      <li key={`${option.id}-${i}`} style={{ fontSize: "0.85rem" }}>
                        {itemDisplayLabel(item as unknown as MealOptionItemLike)}
                      </li>
                    ))
                  : (
                      <li key={option.id} style={{ fontSize: "0.85rem" }}>{option.freeText}</li>
                    )
              )}
            </ul>
          ) : (
            <div className="plan-doc-recipes">
              {meal.options.map((option, optionIndex) => (
                <div key={option.id} className="plan-doc-recipe-card">
                  {optionIndex > 0 && (
                    <div className="text-tertiary" style={{ textAlign: "center", fontSize: "0.78rem", padding: "4px 0" }}>
                      — OU —
                    </div>
                  )}
                  <div className="plan-doc-recipe-body">
                    <div className="plan-doc-recipe-title-row">
                      <strong>{option.label}</strong>
                    </div>
                    {option.isStructured ? (
                      <ul style={{ paddingLeft: 16, listStyle: "disc", display: "flex", flexDirection: "column", gap: 3 }}>
                        {option.items.map((rawItem, i) => {
                          const item = rawItem as unknown as MealOptionItemLike;
                          const qty = itemQuantityLabel(item);
                          const kcal = itemKcalLabel(item);
                          return (
                            <li key={i} style={{ fontSize: "0.85rem" }}>
                              {qty ? `${qty} de ` : ""}
                              {itemDisplayLabel(item)}
                              {itemIsPending(item) && <span className="text-tertiary"> (pendente)</span>}
                              {kcal && <span className="text-tertiary"> — {kcal}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <>
                        {(() => {
                          const linkedRecipe = (option.items as unknown as MealOptionItemLike[]).find((i) => i.recipe)?.recipe;
                          if (!linkedRecipe) return null;
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              {linkedRecipe.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={linkedRecipe.imageUrl} alt={linkedRecipe.name} style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
                              )}
                              <strong>{linkedRecipe.name}</strong>
                            </div>
                          );
                        })()}
                        <p className="plan-doc-ingredients">{option.freeText}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {generalGuidelines && (
        <section className="plan-doc-meal">
          <h3>Orientações gerais</h3>
          <ul style={{ paddingLeft: 18, listStyle: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
            {generalGuidelines.split("\n").filter(Boolean).map((g, i) => (
              <li key={i} style={{ fontSize: "0.85rem" }}>{g}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="plan-doc-footer">
        {settings.phone && <span>📞 {settings.phone}</span>}
        {settings.email && <span>✉️ {settings.email}</span>}
        {settings.address && <span>📍 {settings.address}</span>}
        {settings.instagram && <span>📷 {settings.instagram}</span>}
      </footer>
    </div>
  );
}
