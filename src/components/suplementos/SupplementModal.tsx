"use client";

import { useState, useTransition } from "react";
import { createSupplement, updateSupplement } from "@/actions/supplements";
import type { Supplement } from "@/generated/prisma/client";

const ORIGIN_OPTIONS = [
  { value: "LOJA_SUPLEMENTOS", label: "Loja de suplementos" },
  { value: "MANIPULADO", label: "Manipulado" },
  { value: "AMBOS", label: "Loja e manipulado" },
];

export function SupplementModal({ supplement, trigger }: { supplement?: Supplement; trigger: React.ReactNode }) {
  const isEdit = !!supplement;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        formData.set("id", supplement.id);
        await updateSupplement(formData);
      } else {
        await createSupplement(formData);
      }
      setOpen(false);
    });
  }

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
          <div className="card glass card-pad animate-in" style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>{isEdit ? "Editar ativo" : "Novo ativo"}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="s-name">Nome do ativo</label>
                <input className="input" id="s-name" name="activeName" required defaultValue={supplement?.activeName} placeholder="Ex: Creatina monoidratada" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="s-category">Categoria</label>
                  <input className="input" id="s-category" name="category" defaultValue={supplement?.category ?? ""} placeholder="Proteína, Mineral..." />
                </div>
                <div className="field">
                  <label htmlFor="s-origin">Origem</label>
                  <select className="input" id="s-origin" name="origin" defaultValue={supplement?.origin ?? "LOJA_SUPLEMENTOS"}>
                    {ORIGIN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="s-dose">Dose padrão</label>
                  <input className="input" id="s-dose" name="defaultDose" defaultValue={supplement?.defaultDose ?? ""} placeholder="Ex: 5 g" />
                </div>
                <div className="field">
                  <label htmlFor="s-timing">Horário padrão</label>
                  <input className="input" id="s-timing" name="defaultTiming" defaultValue={supplement?.defaultTiming ?? ""} placeholder="Ex: café da manhã" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="s-route">Via</label>
                <input className="input" id="s-route" name="defaultRoute" defaultValue={supplement?.defaultRoute ?? "Oral"} />
              </div>
              <div className="field">
                <label htmlFor="s-ul">Limite superior tolerável (opcional)</label>
                <input className="input" id="s-ul" name="ulNote" defaultValue={supplement?.ulNote ?? ""} placeholder="Res. CFN 731/2022" />
              </div>
              <div className="field">
                <label htmlFor="s-notes">Notas</label>
                <textarea className="input" id="s-notes" name="notes" rows={2} defaultValue={supplement?.notes ?? ""} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar ativo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
