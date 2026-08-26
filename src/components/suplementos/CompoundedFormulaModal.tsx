"use client";

import { useState, useTransition } from "react";
import { createCompoundedFormula, updateCompoundedFormula } from "@/actions/supplements";
import { FormulaItemBuilder } from "./FormulaItemBuilder";
import type { Supplement, CompoundedFormula, CompoundedFormulaItem } from "@/generated/prisma/client";

type FormulaForEdit = CompoundedFormula & { items: CompoundedFormulaItem[] };

export function CompoundedFormulaModal({ formula, actives, trigger }: { formula?: FormulaForEdit; actives: Supplement[]; trigger: React.ReactNode }) {
  const isEdit = !!formula;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        formData.set("id", formula.id);
        await updateCompoundedFormula(formData);
      } else {
        await createCompoundedFormula(formData);
      }
      setOpen(false);
    });
  }

  const initialRows = formula?.items.map((item) => ({ supplementId: item.supplementId ?? "", activeName: item.activeName, quantity: item.quantity }));

  return (
    <>
      <span
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        style={{ cursor: "pointer", display: "inline-flex" }}
      >
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>{isEdit ? "Editar fórmula manipulada" : "Nova fórmula manipulada"}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="cf-name">Nome</label>
                <input className="input" id="cf-name" name="name" required defaultValue={formula?.name} placeholder="Ex: Pré-treino manipulado (sachê saborizado)" />
              </div>
              <div className="field">
                <label htmlFor="cf-presentation">Apresentação</label>
                <input className="input" id="cf-presentation" name="presentation" defaultValue={formula?.presentation ?? ""} placeholder="Ex: 40 doses em sachês" />
              </div>
              <div className="field">
                <label htmlFor="cf-posology">Posologia</label>
                <textarea className="input" id="cf-posology" name="posology" rows={2} defaultValue={formula?.posology ?? ""} placeholder="Ex: Diluir uma dose em copo de água. Tomar 30 min antes do treino." />
              </div>
              <div className="field">
                <label htmlFor="cf-route">Via</label>
                <input className="input" id="cf-route" name="route" defaultValue={formula?.route ?? "Oral"} />
              </div>

              <FormulaItemBuilder actives={actives} initialRows={initialRows} />

              <div className="field">
                <label htmlFor="cf-notes">Notas</label>
                <textarea className="input" id="cf-notes" name="notes" rows={2} defaultValue={formula?.notes ?? ""} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar fórmula"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
