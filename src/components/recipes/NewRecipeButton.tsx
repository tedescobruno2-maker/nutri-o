"use client";

import { useRef, useState, useTransition } from "react";
import { createRecipe, attachRecipeImage } from "@/actions/recipes";
import { RecipeIngredientBuilder } from "./RecipeIngredientBuilder";
import { ImagePicker } from "@/components/images/ImagePicker";
import { suggestImageSearchTerm } from "@/lib/images/searchTerm";
import type { Food } from "@/generated/prisma/client";

const MEAL_CATEGORIES = [
  { value: "", label: "Sem categoria" },
  { value: "desjejum", label: "Desjejum" },
  { value: "almoco", label: "Almoço" },
  { value: "lanche", label: "Lanche" },
  { value: "jantar", label: "Jantar" },
  { value: "ceia", label: "Ceia" },
  { value: "extra", label: "Extra" },
];

export function NewRecipeButton({ foods }: { foods: Food[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [imageAsset, setImageAsset] = useState<{ id: string; url: string; thumbUrl: string | null; altText: string | null } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  // Depois de salvar sem foto, o ImagePicker abre automaticamente para essa receita (5.10.3).
  const [pendingImageFor, setPendingImageFor] = useState<{ id: string; name: string } | null>(null);

  function resetAndClose() {
    formRef.current?.reset();
    setName("");
    setImageAsset(null);
    setShowPicker(false);
    setPendingImageFor(null);
    setOpen(false);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createRecipe(formData);
      if (result.hasImage) {
        resetAndClose();
      } else {
        setPendingImageFor({ id: result.id, name: result.name });
      }
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
          onClick={() => (pendingImageFor ? undefined : setOpen(false))}
        >
          <div
            className="card glass card-pad animate-in"
            style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {pendingImageFor ? (
              <>
                <div className="page-header" style={{ marginBottom: 16 }}>
                  <h2>Receita salva! Quer adicionar uma foto?</h2>
                </div>
                <ImagePicker
                  suggestedTerm={suggestImageSearchTerm(pendingImageFor.name)}
                  altTextDefault={pendingImageFor.name}
                  onSelect={(asset) => {
                    startTransition(async () => {
                      await attachRecipeImage(pendingImageFor.id, asset.id);
                      resetAndClose();
                    });
                  }}
                  onClose={resetAndClose}
                />
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={resetAndClose}>
                  Pular por enquanto
                </button>
              </>
            ) : (
              <>
                <div className="page-header" style={{ marginBottom: 16 }}>
                  <h2>Nova receita</h2>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
                    ✕
                  </button>
                </div>

                <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="field">
                    <label htmlFor="r-name">Nome</label>
                    <input className="input" id="r-name" name="name" required placeholder="Ex: Frango grelhado com batata doce" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="r-description">Descrição curta</label>
                    <input className="input" id="r-description" name="description" placeholder="Ex: Almoço rico em proteína" />
                  </div>

                  <div className="field">
                    <label>Foto da receita (opcional agora — se deixar em branco, sugerimos uma ao salvar)</label>
                    <input type="hidden" name="imageAssetId" value={imageAsset?.id ?? ""} />
                    {imageAsset ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageAsset.thumbUrl ?? imageAsset.url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>
                          Trocar foto
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>
                        📷 Escolher foto agora
                      </button>
                    )}
                    {showPicker && (
                      <div style={{ marginTop: 8 }}>
                        <ImagePicker
                          suggestedTerm={suggestImageSearchTerm(name)}
                          altTextDefault={name}
                          onSelect={(asset) => {
                            setImageAsset(asset);
                            setShowPicker(false);
                          }}
                          onClose={() => setShowPicker(false)}
                        />
                      </div>
                    )}
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
                    Calorias e macros são calculados automaticamente a partir dos alimentos vinculados acima — não dá para digitar um valor.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label htmlFor="r-servings">Porções</label>
                      <input className="input" id="r-servings" name="servings" type="number" min={1} />
                    </div>
                    <div className="field">
                      <label htmlFor="r-prepTime">Tempo de preparo (min)</label>
                      <input className="input" id="r-prepTime" name="prepTimeMin" type="number" min={1} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                    <div className="field">
                      <label htmlFor="r-category">Categoria</label>
                      <select className="input" id="r-category" name="mealCategory" defaultValue="">
                        {MEAL_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 10 }}>
                      <input type="checkbox" name="isExtra" />
                      Receita extra
                    </label>
                  </div>

                  <div className="field">
                    <label htmlFor="r-tags">Tags (separadas por vírgula)</label>
                    <input className="input" id="r-tags" name="tags" placeholder="almoço, low carb" />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                    {isPending ? "Salvando..." : "Adicionar receita"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
