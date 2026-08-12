"use client";

import { useRef, useState, useTransition } from "react";
import { updateClient } from "@/actions/clients";
import type { Client } from "@/generated/prisma/client";

export function EditClientButton({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateClient(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        ✎ Editar dados
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Editar cliente</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="hidden" name="clientId" value={client.id} />
              <div className="field">
                <label htmlFor="e-name">Nome completo</label>
                <input className="input" id="e-name" name="name" required defaultValue={client.name} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label htmlFor="e-age">Idade</label>
                  <input className="input" id="e-age" name="age" type="number" min={0} defaultValue={client.age ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="e-height">Altura (cm)</label>
                  <input className="input" id="e-height" name="height" type="number" min={0} defaultValue={client.height ?? ""} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="e-email">E-mail</label>
                <input className="input" id="e-email" name="email" type="email" defaultValue={client.email ?? ""} placeholder="cliente@email.com" />
              </div>
              <div className="field">
                <label htmlFor="e-phone">Telefone</label>
                <input className="input" id="e-phone" name="phone" defaultValue={client.phone ?? ""} placeholder="(00) 90000-0000" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label htmlFor="e-document">Identidade/CPF</label>
                  <input className="input" id="e-document" name="document" defaultValue={client.document ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="e-profession">Profissão</label>
                  <input className="input" id="e-profession" name="profession" defaultValue={client.profession ?? ""} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="e-goal">Objetivo</label>
                <input className="input" id="e-goal" name="goal" defaultValue={client.goal ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="e-notes">Observações</label>
                <textarea className="input" id="e-notes" name="notes" rows={3} defaultValue={client.notes ?? ""} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : "Salvar alterações"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
