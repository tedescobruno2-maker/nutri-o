"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/actions/clients";

export function NewClientButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createClient(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Novo paciente
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(0.1 0.02 260 / 0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card glass card-pad animate-in"
            style={{ width: "min(480px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Novo paciente</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="name">Nome completo</label>
                <input className="input" id="name" name="name" required placeholder="Ex: Maria Silva" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label htmlFor="birthDate">Data de nascimento</label>
                  <input className="input" id="birthDate" name="birthDate" type="date" />
                </div>
                <div className="field">
                  <label htmlFor="height">Altura (cm)</label>
                  <input className="input" id="height" name="height" type="number" min={0} placeholder="Ex: 170" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input className="input" id="email" name="email" type="email" placeholder="paciente@email.com" />
              </div>
              <div className="field">
                <label htmlFor="phone">Telefone</label>
                <input className="input" id="phone" name="phone" placeholder="(00) 90000-0000" />
              </div>
              <div className="field">
                <label htmlFor="goal">Objetivo</label>
                <input className="input" id="goal" name="goal" placeholder="Ex: Emagrecimento" />
              </div>
              <div className="field">
                <label htmlFor="notes">Observações</label>
                <textarea className="input" id="notes" name="notes" rows={3} placeholder="Notas iniciais sobre o paciente" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : "Adicionar paciente"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
