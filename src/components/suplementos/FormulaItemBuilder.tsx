"use client";

import { useState } from "react";
import type { Supplement } from "@/generated/prisma/client";

type Row = { supplementId: string; activeName: string; quantity: string };

/** Itens de uma fórmula manipulada — activeName é sempre digitado (denormalizado, vai pro PDF da
 * prescrição mesmo que o ativo mude depois); ligar a um Supplement cadastrado é opcional, só
 * ajuda a rastrear. Mesmo espírito de RecipeIngredientBuilder, mais simples (sem grama/medida). */
export function FormulaItemBuilder({ actives, initialRows }: { actives: Supplement[]; initialRows?: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows ?? []);

  function addRow() {
    setRows((prev) => [...prev, { supplementId: "", activeName: "", quantity: "" }]);
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const payload = JSON.stringify(rows.filter((r) => r.activeName.trim() && r.quantity.trim()));

  return (
    <div className="field">
      <label>Composição (ativo + quantidade)</label>
      <input type="hidden" name="itemsJson" value={payload} />

      {rows.map((row, index) => (
        <div key={index} className="animate-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px auto", gap: 8, marginBottom: 8 }}>
          <select
            className="input"
            value={row.supplementId}
            onChange={(e) => {
              const supp = actives.find((a) => a.id === e.target.value);
              updateRow(index, { supplementId: e.target.value, activeName: supp ? supp.activeName : row.activeName });
            }}
          >
            <option value="">Ativo cadastrado (opcional)...</option>
            {actives.map((a) => (
              <option key={a.id} value={a.id}>{a.activeName}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Nome do ativo"
            value={row.activeName}
            onChange={(e) => updateRow(index, { activeName: e.target.value })}
          />
          <input
            className="input"
            placeholder="Ex: 2 g"
            value={row.quantity}
            onChange={(e) => updateRow(index, { quantity: e.target.value })}
          />
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeRow(index)}>
            ✕
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
        + Adicionar item
      </button>
    </div>
  );
}
