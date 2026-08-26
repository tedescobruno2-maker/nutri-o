"use client";

import { useState, useTransition } from "react";
import { createSupplementBrand, updateSupplementBrand } from "@/actions/supplements";
import type { SupplementBrand } from "@/generated/prisma/client";

export function SupplementBrandModal({ brand, trigger }: { brand?: SupplementBrand; trigger: React.ReactNode }) {
  const isEdit = !!brand;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        formData.set("id", brand.id);
        await updateSupplementBrand(formData);
      } else {
        await createSupplementBrand(formData);
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
          <div className="card glass card-pad animate-in" style={{ width: "min(420px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>{isEdit ? "Editar marca" : "Nova marca"}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="b-name">Nome da marca</label>
                <input className="input" id="b-name" name="name" required defaultValue={brand?.name} placeholder="Ex: Vitafor" />
              </div>
              <div className="field">
                <label htmlFor="b-website">Site (opcional)</label>
                <input className="input" id="b-website" name="website" defaultValue={brand?.website ?? ""} placeholder="https://..." />
              </div>
              <div className="field">
                <label htmlFor="b-notes">Notas</label>
                <textarea className="input" id="b-notes" name="notes" rows={2} defaultValue={brand?.notes ?? ""} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar marca"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
