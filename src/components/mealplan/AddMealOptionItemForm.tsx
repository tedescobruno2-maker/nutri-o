"use client";

import { useRef, useState, useTransition } from "react";
import { addMealOptionItem } from "@/actions/mealPlans";
import type { Food } from "@/generated/prisma/client";

export function AddMealOptionItemForm({
  mealOptionId,
  clientId,
  foods,
}: {
  mealOptionId: string;
  clientId: string;
  foods: Food[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMealOptionItem(formData);
      formRef.current?.reset();
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Vincular alimento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="animate-in"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}
    >
      <input type="hidden" name="mealOptionId" value={mealOptionId} />
      <input type="hidden" name="clientId" value={clientId} />
      <select className="input" name="foodId" style={{ minWidth: 180 }}>
        <option value="">Alimento do banco...</option>
        {foods.map((food) => (
          <option key={food.id} value={food.id}>
            {food.name}
          </option>
        ))}
      </select>
      <input className="input" name="quantity" type="number" step="0.1" placeholder="Qtd" style={{ width: 80 }} />
      <input className="input" name="unit" placeholder="Unid." style={{ width: 80 }} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
        {isPending ? "..." : "Adicionar"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
