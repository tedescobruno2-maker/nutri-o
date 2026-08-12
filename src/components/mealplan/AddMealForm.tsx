"use client";

import { useRef, useState, useTransition } from "react";
import { addMeal } from "@/actions/mealPlans";

const SUGGESTIONS = ["Desjejum", "Lanche da manhã", "Almoço", "Lanche da tarde", "Pré-treino", "Jantar", "Ceia"];

export function AddMealForm({ mealPlanId, clientId }: { mealPlanId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMeal(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        + Nova refeição
      </button>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card card-pad animate-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="mealPlanId" value={mealPlanId} />
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field">
        <label htmlFor="meal-name">Nome da refeição</label>
        <input className="input" id="meal-name" name="name" list="meal-suggestions" required placeholder="Ex: Desjejum" />
        <datalist id="meal-suggestions">
          {SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Salvando..." : "Adicionar refeição"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
