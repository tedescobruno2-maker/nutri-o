"use client";

import { useRef, useState, useTransition } from "react";
import { addMeasurement } from "@/actions/clients";

export function AddMeasurementForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMeasurement(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Registrar medição
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="animate-in"
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 10, alignItems: "end", marginTop: 12 }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field">
        <label htmlFor="weight">Peso (kg)</label>
        <input className="input" id="weight" name="weight" type="number" step="0.1" required />
      </div>
      <div className="field">
        <label htmlFor="bodyFat">% Gordura</label>
        <input className="input" id="bodyFat" name="bodyFat" type="number" step="0.1" />
      </div>
      <div className="field">
        <label htmlFor="waist">Cintura (cm)</label>
        <input className="input" id="waist" name="waist" type="number" step="0.1" />
      </div>
      <div className="field">
        <label htmlFor="hip">Quadril (cm)</label>
        <input className="input" id="hip" name="hip" type="number" step="0.1" />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
