"use client";

import { useRef, useState, useTransition } from "react";
import { addMeal } from "@/actions/mealPlans";
import { MEAL_BLOCK_TYPE_DEFAULT_ORDER, MEAL_BLOCK_TYPE_LABELS } from "@/lib/utils";

export function AddMealForm({ mealPlanId, clientId }: { mealPlanId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [blockType, setBlockType] = useState<string>(MEAL_BLOCK_TYPE_DEFAULT_ORDER[0]);

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
        + Bloco
      </button>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card card-pad animate-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="mealPlanId" value={mealPlanId} />
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field">
        <label htmlFor="meal-block-type">Tipo de bloco</label>
        <select id="meal-block-type" className="input" name="blockType" value={blockType} onChange={(e) => setBlockType(e.target.value)}>
          {[...MEAL_BLOCK_TYPE_DEFAULT_ORDER, "LIVRE"].map((bt) => (
            <option key={bt} value={bt}>{MEAL_BLOCK_TYPE_LABELS[bt] ?? bt}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="meal-name">Nome de exibição (opcional)</label>
        <input className="input" id="meal-name" name="name" defaultValue={MEAL_BLOCK_TYPE_LABELS[blockType]} placeholder="Ex: DESJEJUM SEGUNDA E QUINTA" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Salvando..." : "Adicionar bloco"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
