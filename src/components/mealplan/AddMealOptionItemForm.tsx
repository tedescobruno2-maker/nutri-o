"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addMealOptionItem } from "@/actions/mealPlans";
import type { Food } from "@/generated/prisma/client";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

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
  const [foodId, setFoodId] = useState("");
  const [quantity, setQuantity] = useState("");

  const selectedFood = useMemo(() => foods.find((f) => f.id === foodId) ?? null, [foods, foodId]);

  const preview = useMemo(() => {
    if (!selectedFood) return null;
    // Alimento PENDENTE (sem valor nutricional confirmado) — nunca inventa um número aqui.
    if (selectedFood.kcal100 == null || selectedFood.protein100 == null || selectedFood.carbs100 == null || selectedFood.fat100 == null) {
      return null;
    }
    const qty = parseFloat(quantity);
    const factor = (Number.isFinite(qty) && qty > 0 ? qty : 100) / 100;
    return {
      kcal: Math.round(selectedFood.kcal100 * factor),
      protein: round1(selectedFood.protein100 * factor),
      carbs: round1(selectedFood.carbs100 * factor),
      fat: round1(selectedFood.fat100 * factor),
      isEstimate: !(Number.isFinite(qty) && qty > 0),
    };
  }, [selectedFood, quantity]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMealOptionItem(formData);
      formRef.current?.reset();
      setFoodId("");
      setQuantity("");
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
      style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}
    >
      <input type="hidden" name="mealOptionId" value={mealOptionId} />
      <input type="hidden" name="clientId" value={clientId} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          className="input"
          name="foodId"
          style={{ minWidth: 180 }}
          value={foodId}
          onChange={(e) => setFoodId(e.target.value)}
        >
          <option value="">Alimento do banco...</option>
          {foods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          name="quantity"
          type="number"
          step="0.1"
          placeholder="Qtd"
          style={{ width: 80 }}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input className="input" name="unit" placeholder="Unid." style={{ width: 80 }} defaultValue={selectedFood?.defaultUnit ?? ""} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "..." : "Adicionar"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      {selectedFood && preview && (
        <div
          className="animate-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--accent-primary-soft)",
            fontSize: "0.8rem",
          }}
        >
          {selectedFood.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedFood.imageUrl}
              alt={selectedFood.name}
              style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              🥕
            </div>
          )}
          <div>
            <strong>
              {preview.isEstimate ? "Por 100g" : `Para ${quantity}${selectedFood.defaultUnit || "g"}`}:
            </strong>{" "}
            {preview.kcal} kcal · P {preview.protein}g · C {preview.carbs}g · G {preview.fat}g
          </div>
        </div>
      )}
      {selectedFood && !preview && (
        <p className="text-tertiary" style={{ fontSize: "0.78rem" }}>
          Este alimento ainda não tem valor nutricional confirmado (pendente) — ele será adicionado, mas não entra no cálculo do plano até ser preenchido em Banco de Alimentos.
        </p>
      )}
    </form>
  );
}
