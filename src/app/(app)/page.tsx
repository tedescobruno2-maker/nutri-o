import Link from "next/link";
import { getDashboardStats } from "@/lib/dal";
import { KANBAN_LABELS, KANBAN_ICONS, KANBAN_STATUSES, initials, formatDate, calculateAge, calculateBMI, type KanbanStatusValue } from "@/lib/utils";
import { ReturnReminderRow } from "@/components/dashboard/ReturnReminderRow";
import { RescheduleRequestRow } from "@/components/dashboard/RescheduleRequestRow";

// A contagem de dias desde a última consulta (retornos de consulta) precisa ser
// calculada a cada acesso — sem isso a página fica em cache estático e o alerta
// de retorno trava na data do último deploy.
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<KanbanStatusValue, string> = {
  NOVOS: "badge-info",
  EM_AVALIACAO: "badge-warm",
  PLANO_ENTREGUE: "badge-primary",
  ACOMPANHAMENTO: "badge-primary",
};

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const inFollowUp = stats.board.get("ACOMPANHAMENTO")?.length ?? 0;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Bem-vinda de volta 👋</h1>
          <p className="text-muted">Aqui está um resumo dos seus pacientes e planos hoje.</p>
        </div>
        <Link href="/clients" className="btn btn-primary">
          + Novo paciente
        </Link>
      </div>

      <section className="section stat-grid">
        <div className="card glass stat-tile animate-in">
          <div className="stat-icon badge-primary">👥</div>
          <div className="stat-value">{stats.totalClients}</div>
          <div className="stat-label">Pacientes ativos</div>
        </div>
        <div className="card glass stat-tile animate-in">
          <div className="stat-icon badge-info">📈</div>
          <div className="stat-value">{inFollowUp}</div>
          <div className="stat-label">Em acompanhamento</div>
        </div>
        <div className="card glass stat-tile animate-in">
          <div className="stat-icon badge-warm">🎯</div>
          <div className="stat-value">{stats.avgAdherence}%</div>
          <div className="stat-label">Adesão média à dieta</div>
        </div>
        <div className="card glass stat-tile animate-in">
          <div className="stat-icon badge-primary">🍽️</div>
          <div className="stat-value">{stats.recipesCount}</div>
          <div className="stat-label">Receitas cadastradas</div>
        </div>
      </section>

      <section className="section">
        <div className="page-header">
          <h2>Funil do Kanban</h2>
          <Link href="/clients?view=kanban" className="btn btn-ghost btn-sm">
            Ver quadro completo →
          </Link>
        </div>
        <div className="stat-grid">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="card card-hover card-pad animate-in">
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{KANBAN_ICONS[status]}</div>
              <div className="stat-value">{stats.board.get(status)?.length ?? 0}</div>
              <div className="stat-label">{KANBAN_LABELS[status]}</div>
            </div>
          ))}
        </div>
      </section>

      {stats.pendingRescheduleRequests.length > 0 && (
        <section className="section">
          <div className="page-header">
            <h2>📅 Solicitações de reagendamento ({stats.pendingRescheduleRequests.length})</h2>
          </div>
          <div className="card card-pad">
            {stats.pendingRescheduleRequests.map((request) => (
              <RescheduleRequestRow key={request.id} request={request} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="page-header">
          <h2>🔔 Retornos de consulta</h2>
          <p className="text-muted" style={{ fontSize: "0.82rem" }}>
            Pacientes que se aproximam ou já passaram do ciclo de ~30 dias desde a última consulta.
          </p>
        </div>
        <div className="card card-pad">
          {stats.followUpDue.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhum retorno pendente no momento.</p>
          ) : (
            stats.followUpDue.map((client) => <ReturnReminderRow key={client.id} client={client} />)
          )}
        </div>
      </section>

      <section className="section">
        <div className="page-header">
          <h2>Últimas medições registradas</h2>
        </div>
        <div className="card">
          {stats.latestMeasurements.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: "2rem" }}>📭</span>
              <p>Nenhuma medição registrada ainda.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Idade</th>
                    <th>Altura</th>
                    <th>Status</th>
                    <th>Objetivo</th>
                    <th>Peso</th>
                    <th>IMC</th>
                    <th>% Gordura</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.latestMeasurements.map((m) => {
                    const age = m.client.birthDate ? calculateAge(m.client.birthDate) : m.client.age;
                    const bmi = m.bmi ?? (m.client.height ? calculateBMI(m.weight, m.client.height) : null);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="avatar">{initials(m.client.name)}</div>
                            <Link href={`/clients/${m.clientId}`}>{m.client.name}</Link>
                          </div>
                        </td>
                        <td className="text-muted">{age != null ? `${age} anos` : "—"}</td>
                        <td className="text-muted">{m.client.height ? `${m.client.height} cm` : "—"}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[m.client.status as KanbanStatusValue]}`}>
                            {KANBAN_LABELS[m.client.status as KanbanStatusValue]}
                          </span>
                        </td>
                        <td className="text-muted">{m.client.goal || "—"}</td>
                        <td>{m.weight} kg</td>
                        <td>{bmi ?? "—"}</td>
                        <td>{m.bodyFat ? `${m.bodyFat}%` : "—"}</td>
                        <td className="text-muted">{formatDate(m.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
