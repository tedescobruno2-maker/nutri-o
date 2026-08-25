"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { respondSubjectRequest } from "@/actions/subjectRequests";
import { formatDateFull, initials } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  ACESSO: "Acesso aos dados",
  CORRECAO: "Correção de dado",
  PORTABILIDADE: "Portabilidade",
  ELIMINACAO: "Eliminação",
  REVOGACAO: "Revogação de consentimento",
  INFO_COMPARTILHAMENTO: "Com quem os dados foram compartilhados",
};

export function SubjectRequestRow({
  request,
}: {
  request: { id: string; type: string; description: string | null; dueAt: Date; createdAt: Date; client: { id: string; name: string } };
}) {
  const [isPending, startTransition] = useTransition();
  const [responding, setResponding] = useState<"ATENDIDA" | "RECUSADA_FUNDAMENTADA" | null>(null);
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const daysLeft = Math.ceil((request.dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const overdue = daysLeft < 0;

  function handleRespond() {
    if (!responding) return;
    setError(null);
    startTransition(async () => {
      try {
        await respondSubjectRequest({ requestId: request.id, status: responding, responseText });
        setResponding(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao responder.");
      }
    });
  }

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar">{initials(request.client.name)}</div>
          <div>
            <Link href={`/clients/${request.client.id}`} style={{ fontWeight: 700 }}>
              {request.client.name}
            </Link>
            <div className="text-muted" style={{ fontSize: "0.78rem" }}>{TYPE_LABELS[request.type] ?? request.type}</div>
            {request.description && <div className="text-tertiary" style={{ fontSize: "0.76rem" }}>{request.description}</div>}
          </div>
        </div>
        <span className={`badge ${overdue ? "badge-danger" : "badge-warm"}`}>
          {overdue ? `Atrasada · prazo era ${formatDateFull(request.dueAt)}` : `${daysLeft}d restantes`}
        </span>
      </div>

      {!responding ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={() => setResponding("ATENDIDA")}>
            Marcar como atendida
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setResponding("RECUSADA_FUNDAMENTADA")}>
            Recusar (com justificativa)
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder={responding === "ATENDIDA" ? "O que foi feito" : "Motivo da recusa (obrigatório)"}
            className="input"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={isPending || !responseText.trim()} onClick={handleRespond}>
            Confirmar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setResponding(null)}>
            Cancelar
          </button>
        </div>
      )}
      {error && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</span>}
    </div>
  );
}
