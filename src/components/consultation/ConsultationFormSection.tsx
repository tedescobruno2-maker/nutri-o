import { SendFormButton } from "./SendFormButton";
import { CONSULTATION_FORM_STATUS_LABELS, MAIN_GOAL_LABELS, formatDateFull, type MainGoalValue } from "@/lib/utils";
import type { ConsultationForm } from "@/generated/prisma/client";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-neutral",
  SENT: "badge-warm",
  COMPLETED: "badge-primary",
};

export function ConsultationFormSection({
  clientId,
  hasEmail,
  form,
}: {
  clientId: string;
  hasEmail: boolean;
  form: ConsultationForm | null;
}) {
  const status = form?.status ?? "PENDING";

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="chart-card-header">
        <h3>Formulário Pré-Consulta</h3>
        <span className={`badge ${STATUS_BADGE[status]}`}>{CONSULTATION_FORM_STATUS_LABELS[status]}</span>
      </div>

      <SendFormButton clientId={clientId} hasEmail={hasEmail} />

      {form?.status === "COMPLETED" && (
        <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <div className="data-table" style={{ fontSize: "0.85rem" }}>
            <FormRow label="Nome completo" value={form.fullName} />
            <FormRow label="Identidade/CPF" value={form.document} />
            <FormRow label="Profissão" value={form.profession} />
            <FormRow label="Altura" value={form.height ? `${form.height} cm` : null} />
            <FormRow label="Nascimento" value={form.birthDate ? formatDateFull(form.birthDate) : null} />
            <FormRow label="Objetivo principal" value={form.mainGoal ? MAIN_GOAL_LABELS[form.mainGoal as MainGoalValue] : null} />
            <FormRow label="Já fez acompanhamento" value={form.hasNutritionalFollowUp == null ? null : form.hasNutritionalFollowUp ? "Sim" : "Não"} />
            <FormRow label="Patologia" value={form.pathology} />
            <FormRow label="Atividade física" value={form.doesPhysicalActivity == null ? null : form.doesPhysicalActivity ? "Sim" : "Não"} />
            <FormRow label="Frequência" value={form.physicalActivityFrequency} />
            <FormRow label="Medicamentos" value={form.medications} />
            <FormRow label="Qualidade do sono" value={form.sleepQuality} />
            <FormRow label="Saúde intestinal" value={form.gutHealth} />
          </div>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span className="text-tertiary">{label}</span>
      <span style={{ textAlign: "right", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
