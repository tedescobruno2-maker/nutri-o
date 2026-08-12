"use client";

import { useRef, useState, useTransition } from "react";
import { addDietLog } from "@/actions/clients";

export function AddDietLogForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addDietLog(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Registrar semana
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="animate-in"
      style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 10, alignItems: "end", marginTop: 12 }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field">
        <label htmlFor="weekStart">Início da semana</label>
        <input className="input" id="weekStart" name="weekStart" type="date" required />
      </div>
      <div className="field">
        <label htmlFor="adherence">Adesão (%)</label>
        <input className="input" id="adherence" name="adherence" type="number" min={0} max={100} required />
      </div>
      <div className="field">
        <label htmlFor="protein">Proteína (g)</label>
        <input className="input" id="protein" name="protein" type="number" step="1" />
      </div>
      <div className="field">
        <label htmlFor="carbs">Carbo (g)</label>
        <input className="input" id="carbs" name="carbs" type="number" step="1" />
      </div>
      <div className="field">
        <label htmlFor="fat">Gordura (g)</label>
        <input className="input" id="fat" name="fat" type="number" step="1" />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
