import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { getProfessionalSettings } from "@/lib/dal";
import { PlanDocumentView } from "@/components/mealplan/PlanDocumentView";
import { GeneratePatientPdfButton } from "@/components/portal/GeneratePatientPdfButton";
import { formatDateFull, calculateAge } from "@/lib/utils";

export default async function PortalPlanoHistoricoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const db = dbForPatient(sessionUser.clientId);
  const [plan, client, settings] = await Promise.all([db.getPlanById(id), db.getClient(), getProfessionalSettings()]);
  if (!plan || !client) notFound();

  const weight = plan.consultation ? (await db.getNearestMeasurement(plan.consultation.date))?.weight ?? null : null;
  const age = client.birthDate ? calculateAge(client.birthDate) : client.age;
  const initialGuidanceText = plan.initialGuidanceOverride || plan.initialGuidance?.content || null;

  return (
    <div className="animate-in">
      <div className="page-header no-print">
        <Link href="/portal/plano/historico" className="btn btn-ghost btn-sm">
          ← Voltar para planos anteriores
        </Link>
        <GeneratePatientPdfButton mealPlanId={plan.id} />
      </div>

      <PlanDocumentView
        title={plan.title}
        clientName={client.name}
        clientGoal={client.goal}
        clientAge={age}
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
