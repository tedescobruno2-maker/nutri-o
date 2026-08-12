"use client";

import { useRef, useState, useTransition } from "react";
import { createRecipe } from "@/actions/recipes";
import { RecipeIngredientBuilder } from "./RecipeIngredientBuilder";
import type { Food } from "@/generated/prisma/client";

export function NewRecipeButton({ foods }: { foods: Food[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createRecipe(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Nova receita
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(0.1 0.02 260 / 0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 16,
            overflowY: "auto",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card glass card-pad animate-in"
            style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Nova receita</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="r-name">Nome</label>
                <input className="input" id="r-name" name="name" required placeholder="Ex: Frango grelhado com batata doce" />
              </div>
              <div className="field">
                <label htmlFor="r-description">Descrição curta</label>
                <input className="input" id="r-description" name="description" placeholder="Ex: Almoço rico em proteína" />
              </div>
              <div className="field">
                <label htmlFor="r-photo">Foto da receita</label>
                <input className="input" id="r-photo" name="photo" type="file" accept="image/*" />
              </div>
              <div className="field">
                <label htmlFor="r-ingredients">Ingredientes (um por linha)</label>
                <textarea className="input" id="r-ingredients" name="ingredients" rows={4} required placeholder={"150g de frango\n1 batata doce\n..."} />
              </div>
              <div className="field">
                <label htmlFor="r-instructions">Modo de preparo</label>
                <textarea className="input" id="r-instructions" name="instructions" rows={3} placeholder="Passo a passo do preparo" />
              </div>

              <RecipeIngredientBuilder foods={foods} />

              <p className="text-tertiary" style={{ fontSize: "0.76rem" }}>
                Calorias e macros (opcional — deixe em branco se não souber):
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <div className="field">
                  <label htmlFor="r-calories">Calorias</label>
                  <input className="input" id="r-calories" name="calories" type="number" min={0} />
                </div>
                <div className="field">
                  <label htmlFor="r-protein">Proteína (g)</label>
                  <input className="input" id="r-protein" name="protein" type="number" min={0} />
                </div>
                <div className="field">
                  <label htmlFor="r-carbs">Carbo (g)</label>
                  <input className="input" id="r-carbs" name="carbs" type="number" min={0} />
                </div>
                <div className="field">
                  <label htmlFor="r-fat">Gordura (g)</label>
                  <input className="input" id="r-fat" name="fat" type="number" min={0} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="r-tags">Tags (separadas por vírgula)</label>
                <input className="input" id="r-tags" name="tags" placeholder="almoço, low carb" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : "Adicionar receita"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
