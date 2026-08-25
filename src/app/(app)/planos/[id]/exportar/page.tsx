import { notFound } from "next/navigation";
import Link from "next/link";
import { getMealPlanForExport, getProfessionalSettings, getNearestMeasurement } from "@/lib/dal";
import { PrintButton } from "@/components/planbuilder/PrintButton";
import { GeneratePdfButton } from "@/components/planbuilder/GeneratePdfButton";
import { PlanDocumentView } from "@/components/mealplan/PlanDocumentView";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { formatDateFull, calculateAge } from "@/lib/utils";

export default async function ExportPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, settings] = await Promise.all([getMealPlanForExport(id), getProfessionalSettings()]);
  if (!plan) notFound();
  const clientAge = plan.client.birthDate ? calculateAge(plan.client.birthDate) : plan.client.age;
  const weight = plan.consultation ? (await getNearestMeasurement(plan.clientId, plan.consultation.date))?.weight ?? null : null;
  const initialGuidanceText = plan.initialGuidanceOverride || plan.initialGuidance?.content || null;

  const actor = await getCurrentUser();
  await logAudit({ actorUserId: actor?.id, action: "EXPORTAR", entity: "MealPlan", entityId: id, clientId: plan.clientId, metadata: { documento: "plano_alimentar" } });

  return (
    <div className="animate-in">
      <div className="page-header no-print">
        <Link href={`/clients/${plan.clientId}`} className="btn btn-ghost btn-sm">
          ← Voltar para o paciente
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <PrintButton />
          <GeneratePdfButton mealPlanId={plan.id} withPhotos={true} label="📄 Gerar PDF" />
        </div>
      </div>

      <PlanDocumentView
        title={plan.title}
        clientName={plan.client.name}
        clientGoal={plan.client.goal}
        clientAge={clientAge}
        weight={weight}
        consultationDate={plan.consultation?.date ?? null}
        objective={plan.objective}
        initialGuidanceText={initialGuidanceText}
        generalGuidelines={plan.generalGuidelines}
        meals={plan.meals}
        generatedAtLabel={`Gerado em ${formatDateFull(new Date())}`}
        settings={settings}
      />
    </div>
  );
}
