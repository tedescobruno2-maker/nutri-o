import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { formatDateFull } from "@/lib/utils";

export default async function PortalHomePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const db = dbForPatient(sessionUser.clientId);
  const [client, activePlan, measurements, appointments, examParams] = await Promise.all([
    db.getClient(),
    db.getActivePlan(),
    db.getMeasurements(),
    db.getAppointments(),
    db.getExamResultsGrouped(),
  ]);

  const nextAppointment = appointments[0] ?? null;
  const latestWeight = measurements.at(-1)?.weight ?? null;
  const examsAttention = examParams.filter((p) => p.flag === "ATENCAO");

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Olá, {client?.name.split(" ")[0] ?? sessionUser.name}! 👋</h1>
          <p className="text-muted">Bem-vindo(a) ao seu portal.</p>
        </div>
      </div>

      <section className="section stat-grid">
        <div className="card glass stat-tile">
          <div className="stat-icon badge-primary">⚖️</div>
          <div className="stat-value">{latestWeight != null ? `${latestWeight} kg` : "—"}</div>
          <div className="stat-label">Peso atual</div>
        </div>
        <div className="card glass stat-tile">
          <div className="stat-icon badge-info">📅</div>
          <div className="stat-value" style={{ fontSize: "1rem" }}>{nextAppointment ? formatDateFull(nextAppointment.scheduledAt) : "—"}</div>
          <div className="stat-label">Próxima consulta</div>
        </div>
        <div className="card glass stat-tile">
          <div className="stat-icon badge-warm">📝</div>
          <div className="stat-value" style={{ fontSize: "1rem" }}>{activePlan ? activePlan.title : "—"}</div>
          <div className="stat-label">Plano ativo</div>
        </div>
      </section>

      {examsAttention.length > 0 && (
        <section className="section">
          <div className="card card-pad" style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid var(--danger)" }}>
            <h3 style={{ marginBottom: 8 }}>⚠️ Aviso</h3>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>
              {examsAttention.length} parâmetro(s) de exame fora da faixa de referência.
            </p>
            <Link href="/portal/exames" className="btn btn-ghost btn-sm">Ver exames →</Link>
          </div>
        </section>
      )}

      <section className="section chart-grid-2">
        <Link href="/portal/plano" className="card card-pad" style={{ display: "block" }}>
          <h3>📝 Meu plano alimentar</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Veja suas refeições, fotos e baixe o PDF.</p>
        </Link>
        <Link href="/portal/evolucao" className="card card-pad" style={{ display: "block" }}>
          <h3>📈 Minha evolução</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Peso, composição corporal e adesão à dieta.</p>
        </Link>
        <Link href="/portal/exames" className="card card-pad" style={{ display: "block" }}>
          <h3>🧪 Meus exames</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Resultados e histórico de laboratório.</p>
        </Link>
        <Link href="/portal/suplementos" className="card card-pad" style={{ display: "block" }}>
          <h3>💊 Minha suplementação</h3>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Prescrição atual e histórico.</p>
        </Link>
      </section>
    </div>
  );
}
