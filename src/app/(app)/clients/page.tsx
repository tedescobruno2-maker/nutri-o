import Link from "next/link";
import { getClients } from "@/lib/dal";
import { KANBAN_LABELS, initials, formatDateFull, calculateAge, type KanbanStatusValue } from "@/lib/utils";
import { NewClientButton } from "@/components/kanban/NewClientButton";

const STATUS_BADGE: Record<KanbanStatusValue, string> = {
  NOVOS: "badge-info",
  EM_AVALIACAO: "badge-warm",
  PLANO_ENTREGUE: "badge-primary",
  ACOMPANHAMENTO: "badge-primary",
};

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const allClients = await getClients();
  const clients = q
    ? allClients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : allClients;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Banco de Pacientes</h1>
          <p className="text-muted">
            {allClients.length} paciente(s) cadastrado(s){q ? ` · ${clients.length} encontrado(s)` : ""}.
          </p>
        </div>
        <NewClientButton />
      </div>

      <form method="GET" style={{ marginBottom: 20, maxWidth: 360 }}>
        <input className="input" type="search" name="q" placeholder="Buscar por nome..." defaultValue={q ?? ""} />
      </form>

      <div className="card">
        {clients.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>🗂️</span>
            <p>Nenhum paciente encontrado.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Idade</th>
                <th>Status</th>
                <th>Última consulta</th>
                <th>Último peso</th>
                <th>Contato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const age = client.birthDate ? calculateAge(client.birthDate) : client.age;
                const lastConsultation = client.consultations[0]?.date;
                return (
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar">{initials(client.name)}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{client.name}</div>
                          <div className="text-tertiary" style={{ fontSize: "0.76rem" }}>
                            {client.goal || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{age != null ? `${age} anos` : "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[client.status as KanbanStatusValue]}`}>
                        {KANBAN_LABELS[client.status as KanbanStatusValue]}
                      </span>
                    </td>
                    <td className="text-muted">{lastConsultation ? formatDateFull(lastConsultation) : "—"}</td>
                    <td>{client.measurements[0] ? `${client.measurements[0].weight} kg` : "—"}</td>
                    <td className="text-muted">{client.email || client.phone || "—"}</td>
                    <td>
                      <Link href={`/clients/${client.id}`} className="btn btn-ghost btn-sm">
                        Ver perfil →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
