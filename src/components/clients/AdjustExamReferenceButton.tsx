"use client";

import { useState, useTransition } from "react";
import { setClientExamReference } from "@/actions/examReferences";

export function AdjustExamReferenceButton({
  clientId,
  parameterId,
  currentRef,
}: {
  clientId: string;
  parameterId: string;
  currentRef: { refMin: number | null; refMax: number | null; refText: string | null; reason: string | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refMin, setRefMin] = useState(currentRef?.refMin?.toString() ?? "");
  const [refMax, setRefMax] = useState(currentRef?.refMax?.toString() ?? "");
  const [refText, setRefText] = useState(currentRef?.refText ?? "");
  const [reason, setReason] = useState(currentRef?.reason ?? "");

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-xs no-print" onClick={() => setOpen(true)} style={{ alignSelf: "flex-start" }}>
        {currentRef ? "✎ Ajustar faixa deste paciente" : "+ Ajustar faixa deste paciente"}
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await setClientExamReference({
          clientId,
          parameterId,
          refMin: refMin.trim() ? Number(refMin) : null,
          refMax: refMax.trim() ? Number(refMax) : null,
          refText: refText.trim() || null,
          reason,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar a faixa.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="no-print" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" step="any" value={refMin} onChange={(e) => setRefMin(e.target.value)} placeholder="Mín." className="input" style={{ width: 90 }} />
        <input type="number" step="any" value={refMax} onChange={(e) => setRefMax(e.target.value)} placeholder="Máx." className="input" style={{ width: 90 }} />
      </div>
      <input value={refText} onChange={(e) => setRefText(e.target.value)} placeholder="Texto da faixa (opcional)" className="input" />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (obrigatório — ex: gestante, atleta de endurance, pós-cirúrgico)"
        className="input"
        rows={2}
        required
      />
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="btn btn-primary btn-xs" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen(false)} disabled={isPending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
