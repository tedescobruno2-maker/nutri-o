import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientProfile, getFoods } from "@/lib/dal";
import { WeightChart } from "@/components/charts/WeightChart";
import { AdherenceChart } from "@/components/charts/AdherenceChart";
import { MacroChart } from "@/components/charts/MacroChart";
import { AddMeasurementForm } from "@/components/clients/AddMeasurementForm";
import { AddDietLogForm } from "@/components/clients/AddDietLogForm";
import { MealPlanSection } from "@/components/mealplan/MealPlanSection";
import { AddSupplementForm } from "@/components/supplements/AddSupplementForm";
import { SupplementRow } from "@/components/supplements/SupplementRow";
import { ConsultationFormSection } from "@/components/consultation/ConsultationFormSection";
import { EditClientButton } from "@/components/clients/EditClientButton";
import { KANBAN_LABELS, initials, type KanbanStatusValue } from "@/lib/utils";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, foods] = await Promise.all([getClientProfile(id), getFoods()]);
  if (!client) notFound();

  const latest = client.measurements.at(-1);
  const first = client.measurements[0];
  const delta = latest && first ? Math.round((latest.weight - first.weight) * 10) / 10 : null;
  const latestAdherence = client.dietLogs.at(-1)?.adherence ?? null;
  const activePlan = client.mealPlans[0] ?? null;

  return (
    <div className="animate-in">
      <Link href="/clients" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Voltar para clientes
      </Link>

      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
            {initials(client.name)}
          </div>
          <div>
            <h1>{client.name}</h1>
            <p className="text-muted">
              {client.goal || "Objetivo não definido"} · {client.age ? `${client.age} anos` : "idade não informada"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="badge badge-primary">{KANBAN_LABELS[client.status as KanbanStatusValue]}</span>
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

      <section className="section">
        <MealPlanSection clientId={client.id} mealPlan={activePlan} foods={foods} />
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
                <SupplementRow key={s.id} id={s.id} name={s.name} instructions={s.instructions} clientId={client.id} />
              ))}
            </div>
          )}
          <AddSupplementForm clientId={client.id} />
        </div>

        <ConsultationFormSection clientId={client.id} hasEmail={!!client.email} form={client.consultationForms[0] ?? null} />
      </section>

      {(client.email || client.phone || client.notes || client.document || client.profession) && (
        <section className="section">
          <div className="card card-pad">
            <h3 style={{ marginBottom: 12 }}>Informações de contato</h3>
            <div className="text-muted" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {client.email && <span>✉️ {client.email}</span>}
              {client.phone && <span>📱 {client.phone}</span>}
              {client.document && <span>🪪 {client.document}</span>}
              {client.profession && <span>💼 {client.profession}</span>}
              {client.notes && <span>📝 {client.notes}</span>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
