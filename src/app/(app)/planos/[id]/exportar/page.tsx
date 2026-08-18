import { notFound } from "next/navigation";
import Link from "next/link";
import { getMealPlanForExport, getProfessionalSettings } from "@/lib/dal";
import { PrintButton } from "@/components/planbuilder/PrintButton";
import { formatDateFull, calculateAge } from "@/lib/utils";

export default async function ExportPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, settings] = await Promise.all([getMealPlanForExport(id), getProfessionalSettings()]);
  if (!plan) notFound();
  const clientAge = plan.client.birthDate ? calculateAge(plan.client.birthDate) : plan.client.age;

  return (
    <div className="animate-in">
      <div className="page-header no-print">
        <Link href={`/clients/${plan.clientId}`} className="btn btn-ghost btn-sm">
          ← Voltar para o paciente
        </Link>
        <PrintButton />
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
            {plan.client.height && <span>{plan.client.height} cm</span>}
            {plan.client.goal && <span>{plan.client.goal}</span>}
          </div>
        </section>

        {plan.objective && (
          <p className="plan-doc-objective">
            <strong>Objetivo: </strong>
            {plan.objective}
          </p>
        )}

        {plan.meals.map((meal) => (
          <section key={meal.id} className="plan-doc-meal">
            <h3>{meal.name}</h3>
            <div className="plan-doc-recipes">
              {meal.options.map((option) => {
                const recipe = option.items.find((i) => i.recipe)?.recipe;
                return (
                  <div key={option.id} className="plan-doc-recipe-card">
                    {recipe?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={recipe.imageUrl} alt={recipe.name} className="plan-doc-recipe-media" />
                    ) : (
                      <div className="plan-doc-recipe-media plan-doc-recipe-media-placeholder">🍽️</div>
                    )}
                    <div className="plan-doc-recipe-body">
                      <div className="plan-doc-recipe-title-row">
                        <strong>{option.label}</strong>
                        {recipe?.calories != null && <span className="badge badge-warm">{recipe.calories} kcal</span>}
                      </div>
                      <p className="plan-doc-ingredients">{option.freeText}</p>
                      {recipe && (recipe.protein != null || recipe.carbs != null || recipe.fat != null) && (
                        <p className="text-tertiary" style={{ fontSize: "0.72rem" }}>
                          P {recipe.protein}g · C {recipe.carbs}g · G {recipe.fat}g
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
          {settings.footerText && <span>{settings.footerText}</span>}
        </footer>
      </div>
    </div>
  );
}
