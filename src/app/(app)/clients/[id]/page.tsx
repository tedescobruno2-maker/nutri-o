import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientProfile, getFoodsForBuilder, getRecipesWithIngredients, getChoiceGroupsForBuilder, getGuidanceTexts, getMealPlanTemplates } from "@/lib/dal";
import { WeightChart } from "@/components/charts/WeightChart";
import { AdherenceChart } from "@/components/charts/AdherenceChart";
import { MacroChart } from "@/components/charts/MacroChart";
import { AddMeasurementForm } from "@/components/clients/AddMeasurementForm";
import { AddDietLogForm } from "@/components/clients/AddDietLogForm";
import { MealPlanSection } from "@/components/mealplan/MealPlanSection";
import { AddSupplementForm } from "@/components/supplements/AddSupplementForm";
import { SupplementRow } from "@/components/supplements/SupplementRow";
import { ConsultationFormSection } from "@/components/consultation/ConsultationFormSection";
import { ConsultationHistorySection } from "@/components/clients/ConsultationHistorySection";
import { ExamsSection } from "@/components/clients/ExamsSection";
import { EditClientButton } from "@/components/clients/EditClientButton";
import { ImportScaleButton } from "@/components/clients/ImportScaleButton";
import { InvitePortalButton } from "@/components/clients/InvitePortalButton";
import { BodyCompositionSection } from "@/components/clients/BodyCompositionSection";
import { getSignedDocumentUrl } from "@/actions/upload";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { KANBAN_LABELS, initials, formatDate, formatDateFull, calculateAge, type KanbanStatusValue } from "@/lib/utils";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, foodsForBuilder, recipesWithIngredients, choiceGroups, guidanceTexts, mealPlanTemplates] = await Promise.all([
    getClientProfile(id),
    getFoodsForBuilder(),
    getRecipesWithIngredients(),
    getChoiceGroupsForBuilder(),
    getGuidanceTexts(),
    getMealPlanTemplates(),
  ]);
  if (!client) notFound();

  const actor = await getCurrentUser();
  await logAudit({ actorUserId: actor?.id, action: "VISUALIZAR_PRONTUARIO", entity: "Client", entityId: id, clientId: id });

  // Exames guardam apenas o CAMINHO do documento (bucket privado) — resolve para URL assinada
  // de curta duração aqui, no momento da exibição (Fase 0: dado de saúde nunca fica público).
  const exams = await Promise.all(
    client.exams.map(async (exam) => ({
      ...exam,
      fileUrl: exam.fileUrl ? await getSignedDocumentUrl(exam.fileUrl) : null,
    }))
  );

  const age = client.birthDate ? calculateAge(client.birthDate) : client.age;
  const latest = client.measurements.at(-1);
  const first = client.measurements[0];
  const delta = latest && first ? Math.round((latest.weight - first.weight) * 10) / 10 : null;
  const latestAdherence = client.dietLogs.at(-1)?.adherence ?? null;
  const activePlan = client.mealPlans[0] ?? null;
  const lastConsultation = client.consultations[0]?.date ?? null;
  const measurementHistory = [...client.measurements].reverse(); // mais recente primeiro
  const dietLogHistory = [...client.dietLogs].reverse();

  return (
    <div className="animate-in">
      <Link href="/clients" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Voltar para pacientes
      </Link>

      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
            {initials(client.name)}
          </div>
          <div>
            <h1>{client.name}</h1>
            <p className="text-muted">
              {client.goal || "Objetivo não definido"} · {age != null ? `${age} anos` : "idade não informada"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="badge badge-primary">{KANBAN_LABELS[client.status as KanbanStatusValue]}</span>
          <ImportScaleButton clientId={client.id} clientName={client.name} />
          <InvitePortalButton clientId={client.id} alreadyInvited={!!client.userId} />
          <EditClientButton client={client} />
        </div>
      </div>

      <section className="section stat-grid">
        <div className="card glass stat-tile">
          <div className="stat-icon badge-primary">⚖️</div>
          <div className="stat-value">{latest ? `${latest.weight} kg` : "—"}</div>
          <div className="stat-label">Peso atual</div>
        </div>
        <div className="card glass stat-tile">
          <div className="stat-icon badge-info">📉</div>
          <div className="stat-value">{delta != null ? `${delta > 0 ? "+" : ""}${delta} kg` : "—"}</div>
          <div className="stat-label">Variação total</div>
        </div>
        <div className="card glass stat-tile">
          <div className="stat-icon badge-warm">🎯</div>
          <div className="stat-value">{latestAdherence != null ? `${latestAdherence}%` : "—"}</div>
          <div className="stat-label">Adesão (última semana)</div>
        </div>
        <div className="card glass stat-tile">
          <div className="stat-icon badge-primary">📏</div>
          <div className="stat-value">{client.height ? `${client.height} cm` : "—"}</div>
          <div className="stat-label">Altura</div>
        </div>
      </section>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Evolução de peso</h3>
          </div>
          <WeightChart measurements={client.measurements} />
          <AddMeasurementForm clientId={client.id} />
        </div>
      </section>

      {latest && (latest.bmi != null || latest.muscleMassPercent != null || latest.bmr != null) && (
        <section className="section">
          <BodyCompositionSection measurement={latest} />
        </section>
      )}

      <section className="section chart-grid-2">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Adesão à dieta</h3>
          </div>
          <AdherenceChart dietLogs={client.dietLogs} />
        </div>
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Distribuição de macronutrientes</h3>
          </div>
          <MacroChart dietLogs={client.dietLogs} />
        </div>
      </section>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Registrar semana de dieta</h3>
          </div>
          <AddDietLogForm clientId={client.id} />
        </div>
      </section>

      {/* Histórico de consultas */}
      <section className="section">
        <ConsultationHistorySection clientId={client.id} birthDate={client.birthDate} consultations={client.consultations} />
      </section>

      {/* Histórico completo de medições (peso, evolução, composição corporal) */}
      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Histórico de peso e composição corporal</h3>
          </div>
          {measurementHistory.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhuma medição registrada ainda.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peso</th>
                    <th>% Gordura</th>
                    <th>Massa magra</th>
                    <th>% Massa muscular</th>
                    <th>IMC</th>
                    <th>Calorias (TMB)</th>
                    <th>Gordura visceral</th>
                    <th>Cintura</th>
                    <th>Quadril</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {measurementHistory.map((m) => (
                    <tr key={m.id}>
                      <td className="text-muted">{formatDateFull(m.date)}</td>
                      <td>{m.weight} kg</td>
                      <td>{m.bodyFat != null ? `${m.bodyFat}%` : "—"}</td>
                      <td>{m.fatFreeMassKg != null ? `${m.fatFreeMassKg} kg` : "—"}</td>
                      <td>{m.muscleMassPercent != null ? `${m.muscleMassPercent}%` : "—"}</td>
                      <td>{m.bmi != null ? m.bmi : "—"}</td>
                      <td>{m.bmr != null ? `${m.bmr} kcal` : "—"}</td>
                      <td>{m.visceralFat != null ? m.visceralFat : "—"}</td>
                      <td>{m.waist != null ? `${m.waist} cm` : "—"}</td>
                      <td>{m.hip != null ? `${m.hip} cm` : "—"}</td>
                      <td className="text-tertiary" style={{ fontSize: "0.78rem" }}>{m.source || "Manual"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Histórico de dieta (adesão semanal e macronutrientes/calorias) */}
      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Histórico de dieta (adesão e macros semanais)</h3>
          </div>
          {dietLogHistory.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhum registro de dieta ainda.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Adesão</th>
                    <th>Proteína</th>
                    <th>Carboidrato</th>
                    <th>Gordura</th>
                    <th>Calorias estimadas</th>
                  </tr>
                </thead>
                <tbody>
                  {dietLogHistory.map((d) => {
                    const kcal =
                      d.protein != null && d.carbs != null && d.fat != null
                        ? Math.round(d.protein * 4 + d.carbs * 4 + d.fat * 9)
                        : null;
                    return (
                      <tr key={d.id}>
                        <td className="text-muted">{formatDate(d.weekStart)}</td>
                        <td>{d.adherence}%</td>
                        <td>{d.protein != null ? `${d.protein} g` : "—"}</td>
                        <td>{d.carbs != null ? `${d.carbs} g` : "—"}</td>
                        <td>{d.fat != null ? `${d.fat} g` : "—"}</td>
                        <td>{kcal != null ? `${kcal} kcal` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

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
          mealPlan={activePlan}
          foods={foodsForBuilder}
          recipes={recipesWithIngredients}
          choiceGroups={choiceGroups}
          guidanceTexts={guidanceTexts}
          templates={mealPlanTemplates}
        />
      </section>

      {/* Histórico de planos alimentares anteriores */}
      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Histórico de planos alimentares</h3>
          </div>
          {client.mealPlanHistory.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhum plano anterior registrado.</p>
          ) : (
            <div>
              {client.mealPlanHistory.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{plan.title}</div>
                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                      {formatDateFull(plan.createdAt)} · {plan._count.meals} refeição(ões)
                      {plan.objective ? ` · ${plan.objective}` : ""}
                    </div>
                  </div>
                  <Link href={`/planos/${plan.id}/exportar`} className="btn btn-ghost btn-sm">
                    Ver plano →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section chart-grid-2">
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="chart-card-header">
            <h3>Suplementação</h3>
          </div>
          {client.supplements.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhum suplemento cadastrado.</p>
          ) : (
            <div>
              {client.supplements.map((s) => (
                <SupplementRow
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  instructions={s.instructions}
                  clientId={client.id}
                  active={s.active}
                  discontinuedAt={s.discontinuedAt}
                />
              ))}
            </div>
          )}
          <AddSupplementForm clientId={client.id} />
        </div>

        <ConsultationFormSection clientId={client.id} hasEmail={!!client.email} form={client.consultationForms[0] ?? null} />
      </section>

      {/* Exames solicitados */}
      <section className="section">
        <ExamsSection clientId={client.id} exams={exams} hasEmail={!!client.email} />
      </section>

      {(client.email || client.phone || client.notes || client.document || client.profession || lastConsultation) && (
        <section className="section">
          <div className="card card-pad">
            <h3 style={{ marginBottom: 12 }}>Informações de contato</h3>
            <div className="text-muted" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {client.email && <span>✉️ {client.email}</span>}
              {client.phone && <span>📱 {client.phone}</span>}
              {client.document && <span>🪪 {client.document}</span>}
              {client.profession && <span>💼 {client.profession}</span>}
              {lastConsultation && <span>🗓️ Última consulta: {formatDateFull(lastConsultation)}</span>}
              {client.notes && <span>📝 {client.notes}</span>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
