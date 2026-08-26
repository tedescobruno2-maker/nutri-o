"use client";

import { useState, useTransition } from "react";
import { createSupplementProduct, updateSupplementProduct } from "@/actions/supplements";
import type { Supplement, SupplementBrand, SupplementProduct } from "@/generated/prisma/client";

export function SupplementProductModal({
  product,
  actives,
  brands,
  defaultBrandId,
  trigger,
}: {
  product?: SupplementProduct;
  actives: Supplement[];
  brands: SupplementBrand[];
  defaultBrandId?: string;
  trigger: React.ReactNode;
}) {
  const isEdit = !!product;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        formData.set("id", product.id);
        await updateSupplementProduct(formData);
      } else {
        await createSupplementProduct(formData);
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
              <h2>{isEdit ? "Editar produto" : "Novo produto"}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="p-name">Nome comercial</label>
                <input className="input" id="p-name" name="commercialName" required defaultValue={product?.commercialName} placeholder="Ex: Creafort" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="p-supplement">Ativo</label>
                  <select className="input" id="p-supplement" name="supplementId" required defaultValue={product?.supplementId ?? ""}>
                    <option value="">Selecione...</option>
                    {actives.map((a) => (
                      <option key={a.id} value={a.id}>{a.activeName}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="p-brand">Marca</label>
                  <select className="input" id="p-brand" name="brandId" required defaultValue={product?.brandId ?? defaultBrandId ?? ""}>
                    <option value="">Selecione...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="p-presentation">Apresentação</label>
                  <input className="input" id="p-presentation" name="presentation" defaultValue={product?.presentation ?? ""} placeholder="Ex: pote 300 g" />
                </div>
                <div className="field">
                  <label htmlFor="p-flavors">Sabores</label>
                  <input className="input" id="p-flavors" name="flavors" defaultValue={product?.flavors ?? ""} placeholder="Ex: chocolate, baunilha" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="p-dose">Dose no rótulo</label>
                <input className="input" id="p-dose" name="doseLabel" defaultValue={product?.doseLabel ?? ""} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="p-anvisa">Registro ANVISA (opcional)</label>
                  <input className="input" id="p-anvisa" name="anvisaRef" defaultValue={product?.anvisaRef ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="p-source">Origem do dado</label>
                  <input className="input" id="p-source" name="sourceRef" defaultValue={product?.sourceRef ?? ""} placeholder="Ex: rótulo do produto" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar produto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
