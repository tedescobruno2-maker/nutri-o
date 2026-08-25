import { notFound } from "next/navigation";
import Link from "next/link";
import { getMealPlanForExport, getProfessionalSettings, getNearestMeasurement } from "@/lib/dal";
import { PrintButton } from "@/components/planbuilder/PrintButton";
import { GeneratePdfButton } from "@/components/planbuilder/GeneratePdfButton";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { itemDisplayLabel, itemQuantityLabel, itemKcalLabel, itemIsPending } from "@/lib/planDisplay";
import { MEAL_BLOCK_TYPE_LABELS } from "@/lib/utils";
import { formatDateFull, formatDate, calculateAge } from "@/lib/utils";
import type { MealOptionItemLike } from "@/lib/mealPlanCalc";

export default async function ExportPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, settings] = await Promise.all([getMealPlanForExport(id), getProfessionalSettings()]);
  if (!plan) notFound();
  const clientAge = plan.client.birthDate ? calculateAge(plan.client.birthDate) : plan.client.age;
  const weight = plan.consultation ? (await getNearestMeasurement(plan.clientId, plan.consultation.date))?.weight ?? null : null;
  const initialGuidanceText = plan.initialGuidanceOverride || plan.initialGuidance?.content || null;

  const actor = await getCurrentUser();
  await logAudit({ actorUserId: actor?.id, action: "EXPORTAR", entity: "MealPlan", entityId: id, clientId: plan.clientId, metadata: { documento: "plano_alimentar" } });

  const visibleMeals = plan.meals.filter((m) => m.visible);

  return (
    <div className="animate-in">
      <div className="page-header no-print">
        <Link href={`/clients/${plan.clientId}`} className="btn btn-ghost btn-sm">
          ← Voltar para o paciente
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <PrintButton />
          <GeneratePdfButton mealPlanId={plan.id} withPhotos={true} label="📄 Gerar PDF" />
          <GeneratePdfButton mealPlanId={plan.id} withPhotos={false} label="📄 Gerar PDF (sem fotos)" />
        </div>
      </div>

      <div className="plan-document">
        <header className="plan-doc-header">
          <div>
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.nutritionistName} style={{ height: 32, marginBottom: 6, objectFit: "contain" }} />
            ) : (
              <div className="eyebrow">Nutri Luana Gois</div>
            )}
            <h1>{plan.title}</h1>
            <p className="text-muted">{settings.nutritionistName} — Nutricionista · CRN {settings.crn}</p>
          </div>
          <div className="plan-doc-date text-tertiary">Gerado em {formatDateFull(new Date())}</div>
        </header>

        <section className="plan-doc-client">
          <div>
            <div className="eyebrow">Paciente</div>
            <h2>{plan.client.name}</h2>
          </div>
          <div className="plan-doc-client-meta">
            {clientAge != null && <span>{clientAge} anos</span>}
            {weight != null && <span>Peso no dia da consulta: {weight} kg</span>}
            {plan.consultation && <span>Consulta: {formatDate(plan.consultation.date)}</span>}
            {plan.client.goal && <span>{plan.client.goal}</span>}
          </div>
        </section>

        {plan.objective && (
          <p className="plan-doc-objective">
            <strong>Objetivo: </strong>
            {plan.objective}
          </p>
        )}

        {initialGuidanceText && <p className="plan-doc-objective">{initialGuidanceText}</p>}

        {visibleMeals.map((meal) => (
          <section key={meal.id} className="plan-doc-meal">
            <h3>{(meal.displayTitle || MEAL_BLOCK_TYPE_LABELS[meal.blockType] || meal.name).toUpperCase()}</h3>

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
                        <p className="plan-doc-ingredients">{option.freeText}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {plan.generalGuidelines && (
          <section className="plan-doc-meal">
            <h3>Orientações gerais</h3>
            <ul style={{ paddingLeft: 18, listStyle: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
              {plan.generalGuidelines.split("\n").filter(Boolean).map((g, i) => (
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
          {settings.footerText && <span style={{ whiteSpace: "pre-line" }}>{settings.footerText}</span>}
        </footer>
      </div>
    </div>
  );
}
