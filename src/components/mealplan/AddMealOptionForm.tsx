"use client";

import { useRef, useState, useTransition } from "react";
import { addMealOption } from "@/actions/mealPlans";

export function AddMealOptionForm({ mealId, clientId, nextLabel }: { mealId: string; clientId: string; nextLabel: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMealOption(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Adicionar opção
      </button>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="mealId" value={mealId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input className="input" name="label" defaultValue={nextLabel} placeholder="Ex: Opção 1" />
      <textarea
        className="input"
        name="freeText"
        rows={3}
        required
        placeholder={"3 ovos (omelete ou mexido)\n2 fatias de pão integral\n..."}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar opção"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
