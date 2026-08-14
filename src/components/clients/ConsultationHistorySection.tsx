"use client";

import { useRef, useState, useTransition } from "react";
import { addConsultation, deleteConsultation } from "@/actions/consultations";
import { calculateAge, formatDateFull } from "@/lib/utils";

type ConsultationItem = { id: string; date: Date | string; notes: string | null };

export function ConsultationHistorySection({
  clientId,
  birthDate,
  consultations,
}: {
  clientId: string;
  birthDate: Date | string | null;
  consultations: ConsultationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addConsultation(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <div className="card card-pad">
      <div className="chart-card-header">
        <h3>Histórico de consultas</h3>
        {!open && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
            + Registrar consulta
          </button>
        )}
      </div>

      {open && (
        <form
          ref={formRef}
          action={handleSubmit}
          className="animate-in"
          style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 10, alignItems: "end", margin: "12px 0" }}
        >
          <input type="hidden" name="clientId" value={clientId} />
          <div className="field">
            <label htmlFor="c-date">Data</label>
            <input className="input" id="c-date" name="date" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="c-notes">Observações</label>
            <input className="input" id="c-notes" name="notes" placeholder="Opcional" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}

      {consultations.length === 0 ? (
        <p className="text-tertiary" style={{ fontSize: "0.85rem", marginTop: 8 }}>Nenhuma consulta registrada ainda.</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          {consultations.map((c) => {
            const ageAt = birthDate ? calculateAge(birthDate, c.date) : null;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{formatDateFull(c.date)}</div>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                    {ageAt != null ? `${ageAt} anos na consulta` : "idade não informada"}
                    {c.notes ? ` · ${c.notes}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => startTransition(() => deleteConsultation(c.id, clientId))}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
