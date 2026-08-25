import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { getProfessionalSettings } from "@/lib/dal";
import { PlanDocumentView } from "@/components/mealplan/PlanDocumentView";
import { GeneratePatientPdfButton } from "@/components/portal/GeneratePatientPdfButton";
import { formatDateFull, calculateAge } from "@/lib/utils";

export default async function PortalPlanoPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const db = dbForPatient(sessionUser.clientId);
  const [plan, client, settings] = await Promise.all([db.getActivePlan(), db.getClient(), getProfessionalSettings()]);

  if (!plan || !client) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h1>Meu plano alimentar</h1>
        </div>
        <div className="card">
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>📝</span>
            <p>Você ainda não tem um plano alimentar ativo. Fale com a Luana na sua próxima consulta.</p>
          </div>
        </div>
      </div>
    );
  }

  const weight = plan.consultation ? (await db.getNearestMeasurement(plan.consultation.date))?.weight ?? null : null;
  const age = client.birthDate ? calculateAge(client.birthDate) : client.age;
  const initialGuidanceText = plan.initialGuidanceOverride || plan.initialGuidance?.content || null;

  return (
    <div className="animate-in">
      <div className="page-header no-print">
        <h1>Meu plano alimentar</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <GeneratePatientPdfButton mealPlanId={plan.id} />
          <Link href="/portal/plano/historico" className="btn btn-ghost btn-sm">
            Planos anteriores →
          </Link>
        </div>
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
