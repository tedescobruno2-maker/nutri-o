"use client";

import { useRef, useState, useTransition } from "react";
import { createAppointment } from "@/actions/appointments";

type ClientOption = { id: string; name: string };

export function AddAppointmentModal({
  clients,
  defaultDate,
  defaultClientId,
  defaultType = "CONSULTA",
  trigger,
}: {
  clients: ClientOption[];
  defaultDate?: string; // YYYY-MM-DD
  defaultClientId?: string;
  defaultType?: "CONSULTA" | "RETORNO";
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createAppointment(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        {trigger ?? "+ Agendar consulta"}
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(420px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Agendar consulta</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="ap-client">Paciente</label>
                <select className="input" id="ap-client" name="clientId" required defaultValue={defaultClientId ?? ""}>
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="ap-date">Data e hora</label>
                  <input
                    className="input"
                    id="ap-date"
                    name="scheduledAt"
                    type="datetime-local"
                    required
                    defaultValue={defaultDate ? `${defaultDate}T09:00` : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ap-type">Tipo</label>
                  <select className="input" id="ap-type" name="type" defaultValue={defaultType}>
                    <option value="CONSULTA">Consulta</option>
                    <option value="RETORNO">Retorno</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="ap-notes">Observações</label>
                <input className="input" id="ap-notes" name="notes" placeholder="Opcional" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 4 }}>
                {isPending ? "Salvando..." : "Agendar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
