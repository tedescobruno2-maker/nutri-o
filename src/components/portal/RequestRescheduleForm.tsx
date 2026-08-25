"use client";

import { useState, useTransition } from "react";
import { requestReschedule } from "@/actions/appointmentReschedule";

export function RequestRescheduleForm({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [proposedAt, setProposedAt] = useState("");
  const [alternativeAt, setAlternativeAt] = useState("");
  const [reason, setReason] = useState("");

  if (success) {
    return <span className="badge badge-info">Solicitação enviada — aguardando resposta da Luana</span>;
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Solicitar reagendamento
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await requestReschedule({
          appointmentId,
          proposedAt: new Date(proposedAt),
          alternativeAt: alternativeAt ? new Date(alternativeAt) : null,
          reason: reason || undefined,
        });
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao enviar a solicitação.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)", marginTop: 8 }}>
      <label className="text-tertiary" style={{ fontSize: "0.78rem" }}>
        Novo horário proposto
        <input type="datetime-local" value={proposedAt} onChange={(e) => setProposedAt(e.target.value)} className="input" required />
      </label>
      <label className="text-tertiary" style={{ fontSize: "0.78rem" }}>
        Horário alternativo (opcional)
        <input type="datetime-local" value={alternativeAt} onChange={(e) => setAlternativeAt(e.target.value)} className="input" />
      </label>
      <label className="text-tertiary" style={{ fontSize: "0.78rem" }}>
        Motivo (opcional)
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
      </label>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</span>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar solicitação"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
