"use client";

import { useState } from "react";
import type { Food } from "@/generated/prisma/client";

type Row = { foodId: string; quantity: string; unit: string };

export function RecipeIngredientBuilder({ foods }: { foods: Food[] }) {
  const [rows, setRows] = useState<Row[]>([]);

  function addRow() {
    setRows((prev) => [...prev, { foodId: "", quantity: "", unit: "g" }]);
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const payload = JSON.stringify(
    rows
      .filter((row) => row.foodId)
      .map((row) => ({
        foodId: row.foodId,
        quantity: row.quantity ? Number(row.quantity) : undefined,
        unit: row.unit || undefined,
      }))
  );

  return (
    <div className="field">
      <label>Vincular alimentos do banco (opcional — para relatórios de macros)</label>
      <input type="hidden" name="ingredientItemsJson" value={payload} />

      {rows.map((row, index) => (
        <div key={index} className="animate-in" style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px auto", gap: 8, marginBottom: 8 }}>
          <select
            className="input"
            value={row.foodId}
            onChange={(e) => updateRow(index, { foodId: e.target.value })}
          >
            <option value="">Selecione um alimento...</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            step="0.1"
            placeholder="Qtd"
            value={row.quantity}
            onChange={(e) => updateRow(index, { quantity: e.target.value })}
          />
          <input
            className="input"
            placeholder="Unid."
            value={row.unit}
            onChange={(e) => updateRow(index, { unit: e.target.value })}
          />
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeRow(index)}>
            ✕
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
        + Adicionar alimento
      </button>
    </div>
  );
}
