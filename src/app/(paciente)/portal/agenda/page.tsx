import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { formatDateFull } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = { CONSULTA: "Consulta", RETORNO: "Retorno" };
const STATUS_LABELS: Record<string, string> = { AGENDADO: "Agendado", CONFIRMADO: "Confirmado", REALIZADO: "Realizado", CANCELADO: "Cancelado" };

export default async function PortalAgendaPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const appointments = await dbForPatient(sessionUser.clientId).getAppointments();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Minha agenda</h1>
          <p className="text-muted">Precisa remarcar? Fale com a Luana por telefone ou WhatsApp.</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>📅</span>
            <p>Nenhuma consulta agendada no momento.</p>
          </div>
        </div>
      ) : (
        <div className="card card-pad">
          {appointments.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{TYPE_LABELS[a.type] ?? a.type}</div>
                <div className="text-muted" style={{ fontSize: "0.8rem" }}>{formatDateFull(a.scheduledAt)}</div>
              </div>
              <span className="badge badge-info">{STATUS_LABELS[a.status] ?? a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
