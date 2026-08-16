import Link from "next/link";
import { KANBAN_LABELS, KANBAN_ICONS, initials, formatDateFull, calculateAge, type KanbanStatusValue } from "@/lib/utils";
import type { getClients } from "@/lib/dal";

const STATUS_BADGE: Record<KanbanStatusValue, string> = {
  NOVOS: "badge-info",
  EM_AVALIACAO: "badge-warm",
  PLANO_ENTREGUE: "badge-primary",
  ACOMPANHAMENTO: "badge-primary",
};

type Clients = Awaited<ReturnType<typeof getClients>>;

export function CardsView({ clients }: { clients: Clients }) {
  if (clients.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <span style={{ fontSize: "2rem" }}>🪪</span>
          <p>Nenhum paciente encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-cards-grid">
      {clients.map((client) => {
        const age = client.birthDate ? calculateAge(client.birthDate) : client.age;
        const lastConsultation = client.consultations[0]?.date;
        return (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="card card-hover card-pad"
            style={{ display: "flex", flexDirection: "column", gap: 10, color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="avatar" style={{ width: 44, height: 44 }}>
                {initials(client.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {client.name}
                </div>
                <div className="text-tertiary" style={{ fontSize: "0.74rem" }}>
                  {age != null ? `${age} anos` : "idade não informada"}
                </div>
              </div>
            </div>

            <span className={`badge ${STATUS_BADGE[client.status as KanbanStatusValue]}`} style={{ alignSelf: "flex-start" }}>
              {KANBAN_ICONS[client.status as KanbanStatusValue]} {KANBAN_LABELS[client.status as KanbanStatusValue]}
            </span>

            {client.goal && (
              <p className="text-muted" style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {client.goal}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginTop: "auto", paddingTop: 6, borderTop: "1px solid var(--border-subtle)" }}>
              <span className="text-tertiary">{client.measurements[0] ? `${client.measurements[0].weight} kg` : "sem peso"}</span>
              <span className="text-tertiary">{lastConsultation ? formatDateFull(lastConsultation) : "sem consulta"}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
