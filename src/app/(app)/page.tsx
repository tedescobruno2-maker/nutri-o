import Link from "next/link";
import { getDashboardStats } from "@/lib/dal";
import { KANBAN_LABELS, KANBAN_ICONS, KANBAN_STATUSES, initials, formatDate } from "@/lib/utils";

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
        <Link href="/kanban" className="btn btn-primary">
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
          <Link href="/kanban" className="btn btn-ghost btn-sm">
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Peso</th>
                  <th>% Gordura</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.latestMeasurements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar">{initials(m.client.name)}</div>
                        <Link href={`/clients/${m.clientId}`}>{m.client.name}</Link>
                      </div>
                    </td>
                    <td>{m.weight} kg</td>
                    <td>{m.bodyFat ? `${m.bodyFat}%` : "—"}</td>
                    <td className="text-muted">{formatDate(m.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
