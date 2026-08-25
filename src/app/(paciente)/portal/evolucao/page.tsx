import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { WeightChart } from "@/components/charts/WeightChart";
import { AdherenceChart } from "@/components/charts/AdherenceChart";
import { MacroChart } from "@/components/charts/MacroChart";
import { BodyCompositionSection } from "@/components/clients/BodyCompositionSection";

export default async function PortalEvolucaoPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const db = dbForPatient(sessionUser.clientId);
  const [measurements, dietLogs] = await Promise.all([db.getMeasurements(), db.getDietLogs()]);
  const latest = measurements.at(-1);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Minha evolução</h1>
      </div>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Evolução de peso</h3>
          </div>
          <WeightChart measurements={measurements} />
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
          <AdherenceChart dietLogs={dietLogs} />
        </div>
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Distribuição de macronutrientes</h3>
          </div>
          <MacroChart dietLogs={dietLogs} />
        </div>
      </section>
    </div>
  );
}
