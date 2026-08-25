"use client";

import { useState, useTransition } from "react";
import { createSubjectRequest } from "@/actions/subjectRequests";
import { formatDateFull } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  ACESSO: "Acesso aos meus dados",
  CORRECAO: "Correção de um dado incorreto",
  PORTABILIDADE: "Portabilidade (já disponível no botão acima)",
  ELIMINACAO: "Eliminação de dados",
  REVOGACAO: "Revogação de consentimento",
  INFO_COMPARTILHAMENTO: "Saber com quem meus dados foram compartilhados",
};

const STATUS_LABELS: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  ATENDIDA: "Atendida",
  RECUSADA_FUNDAMENTADA: "Recusada (com justificativa)",
};

const STATUS_BADGE: Record<string, string> = {
  ABERTA: "badge-info",
  EM_ANDAMENTO: "badge-warm",
  ATENDIDA: "badge-primary",
  RECUSADA_FUNDAMENTADA: "badge-danger",
};

type Request = {
  id: string;
  type: string;
  status: string;
  description: string | null;
  responseText: string | null;
  dueAt: Date;
  createdAt: Date;
};

export function SubjectRequestSection({ requests }: { requests: Request[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("ACESSO");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createSubjectRequest({ type: type as never, description: description || undefined });
        setOpen(false);
        setDescription("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao enviar a solicitação.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {requests.length === 0 ? (
        <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhuma solicitação feita ainda.</p>
      ) : (
        requests.map((r) => (
          <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.88rem" }}>{TYPE_LABELS[r.type] ?? r.type}</span>
              <span className={`badge ${STATUS_BADGE[r.status] ?? "badge-info"}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
            </div>
            <div className="text-tertiary" style={{ fontSize: "0.74rem" }}>
              Aberta em {formatDateFull(r.createdAt)} · prazo até {formatDateFull(r.dueAt)}
            </div>
            {r.responseText && <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>Resposta: {r.responseText}</p>}
          </div>
        ))
      )}

      {!open ? (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
          + Nova solicitação
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input">
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhe o que precisa (opcional)" className="input" rows={2} />
          {error && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</span>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
