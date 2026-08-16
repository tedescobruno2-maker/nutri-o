import Link from "next/link";
import { KANBAN_LABELS, initials, formatDateFull, calculateAge, type KanbanStatusValue } from "@/lib/utils";
import type { getClients } from "@/lib/dal";

const STATUS_BADGE: Record<KanbanStatusValue, string> = {
  NOVOS: "badge-info",
  EM_AVALIACAO: "badge-warm",
  PLANO_ENTREGUE: "badge-primary",
  ACOMPANHAMENTO: "badge-primary",
};

type Clients = Awaited<ReturnType<typeof getClients>>;

export function TableView({ clients }: { clients: Clients }) {
  if (clients.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <span style={{ fontSize: "2rem" }}>🗂️</span>
          <p>Nenhum paciente encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
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
    </div>
  );
}
