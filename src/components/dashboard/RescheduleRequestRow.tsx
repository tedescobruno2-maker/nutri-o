"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { decideReschedule } from "@/actions/appointmentReschedule";
import { formatDateFull, initials } from "@/lib/utils";

export function RescheduleRequestRow({
  request,
}: {
  request: {
    id: string;
    proposedAt: Date;
    alternativeAt: Date | null;
    reason: string | null;
    appointment: { id: string; scheduledAt: Date; client: { id: string; name: string } };
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState<"APROVADO" | "RECUSADO" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleDecide(decision: "APROVADO" | "RECUSADO") {
    setError(null);
    startTransition(async () => {
      try {
        await decideReschedule({ requestId: request.id, decision, decisionNote: note || undefined });
        setShowNote(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao decidir.");
      }
    });
  }

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar">{initials(request.appointment.client.name)}</div>
          <div>
            <Link href={`/clients/${request.appointment.client.id}`} style={{ fontWeight: 700 }}>
              {request.appointment.client.name}
            </Link>
            <div className="text-muted" style={{ fontSize: "0.78rem" }}>
              Horário atual: {formatDateFull(request.appointment.scheduledAt)}
            </div>
            <div className="text-muted" style={{ fontSize: "0.78rem" }}>
              Proposto: {formatDateFull(request.proposedAt)}
              {request.alternativeAt && <> · alternativa: {formatDateFull(request.alternativeAt)}</>}
            </div>
            {request.reason && <div className="text-tertiary" style={{ fontSize: "0.76rem" }}>Motivo: {request.reason}</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={() => setShowNote("APROVADO")}>
            ✓ Aprovar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setShowNote("RECUSADO")}>
            ✕ Recusar
          </button>
        </div>
      </div>

      {showNote && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota para o paciente (opcional)"
            className="input"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={() => handleDecide(showNote)}>
            {isPending ? "Enviando..." : `Confirmar ${showNote === "APROVADO" ? "aprovação" : "recusa"}`}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setShowNote(null)}>
            Cancelar
          </button>
        </div>
      )}

      {error && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</span>}
    </div>
  );
}
