"use client";

import { useRef, useState, useTransition } from "react";
import { createFood } from "@/actions/foods";

export function NewFoodButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createFood(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Novo alimento
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(480px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Novo alimento</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="f-name">Nome</label>
                <input className="input" id="f-name" name="name" required placeholder="Ex: Peito de frango" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-category">Categoria</label>
                  <input className="input" id="f-category" name="category" placeholder="Ex: Proteína" />
                </div>
                <div className="field">
                  <label htmlFor="f-unit">Unidade padrão</label>
                  <input className="input" id="f-unit" name="defaultUnit" defaultValue="g" placeholder="g, ml, unidade..." />
                </div>
              </div>
              <p className="text-tertiary" style={{ fontSize: "0.76rem" }}>Valores nutricionais por 100g (ou 100ml):</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-kcal">Kcal</label>
                  <input className="input" id="f-kcal" name="kcal100" type="number" step="0.1" min={0} required />
                </div>
                <div className="field">
                  <label htmlFor="f-protein">Proteína (g)</label>
                  <input className="input" id="f-protein" name="protein100" type="number" step="0.1" min={0} required />
                </div>
                <div className="field">
                  <label htmlFor="f-carbs">Carbo (g)</label>
                  <input className="input" id="f-carbs" name="carbs100" type="number" step="0.1" min={0} required />
                </div>
                <div className="field">
                  <label htmlFor="f-fat">Gordura (g)</label>
                  <input className="input" id="f-fat" name="fat100" type="number" step="0.1" min={0} required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : "Adicionar alimento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
