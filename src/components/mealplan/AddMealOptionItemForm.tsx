"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addMealOptionItem, type AddMealOptionItemResult } from "@/actions/mealPlans";
import { calcMealOptionItem, type MealOptionItemLike } from "@/lib/mealPlanCalc";
import { FOOD_PREPARATION_LABELS } from "@/lib/utils";
import type { Food, FoodMeasure, GuidanceText } from "@/generated/prisma/client";
import type { RecipeView, ChoiceGroupView } from "./types";

type FoodWithMeasures = Food & { measures: FoodMeasure[] };
type Tab = "alimento" | "receita" | "grupo" | "texto";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function CalcPreview({ item }: { item: MealOptionItemLike | null }) {
  if (!item) return null;
  const result = calcMealOptionItem(item);
  if (result.status === "CALCULADO" || result.status === "FAIXA") {
    const { min, max } = result.range;
    const sameValue = min.kcal === max.kcal;
    return (
      <p className="text-muted" style={{ fontSize: "0.8rem" }}>
        {sameValue ? `${Math.round(min.kcal)} kcal` : `${Math.round(min.kcal)}–${Math.round(max.kcal)} kcal`} · P{" "}
        {sameValue ? round1(min.protein) : `${round1(min.protein)}–${round1(max.protein)}`}g · C{" "}
        {sameValue ? round1(min.carbs) : `${round1(min.carbs)}–${round1(max.carbs)}`}g · G{" "}
        {sameValue ? round1(min.fat) : `${round1(min.fat)}–${round1(max.fat)}`}g
      </p>
    );
  }
  return (
    <p className="text-tertiary" style={{ fontSize: "0.78rem" }}>
      {result.warnings[0]?.message ?? "Não calculável."}
    </p>
  );
}

export function AddMealOptionItemForm({
  mealOptionId,
  clientId,
  foods,
  recipes,
  choiceGroups,
  guidanceTexts,
}: {
  mealOptionId: string;
  clientId: string;
  foods: FoodWithMeasures[];
  recipes: RecipeView[];
  choiceGroups: ChoiceGroupView[];
  guidanceTexts: GuidanceText[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("alimento");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ field: string; term: string; itemLabel: string; formData: FormData } | null>(null);

  // ---- Aba Alimento ----
  const [foodSearch, setFoodSearch] = useState("");
  const [foodId, setFoodId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityMax, setQuantityMax] = useState("");
  const [measureId, setMeasureId] = useState("");
  const [quantityText, setQuantityText] = useState("");

  const filteredFoods = useMemo(() => {
    if (!foodSearch.trim()) return foods.slice(0, 60);
    const q = foodSearch.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q) || f.baseName.toLowerCase().includes(q)).slice(0, 60);
  }, [foods, foodSearch]);

  const selectedFood = useMemo(() => foods.find((f) => f.id === foodId) ?? null, [foods, foodId]);
  const siblingFoods = useMemo(() => {
    if (!selectedFood) return [];
    return foods.filter((f) => f.baseName === selectedFood.baseName).sort((a, b) => a.preparation.localeCompare(b.preparation));
  }, [foods, selectedFood]);
  const selectedMeasure = selectedFood?.measures.find((m) => m.id === measureId) ?? null;

  const foodItemLike: MealOptionItemLike | null = selectedFood
    ? {
        itemType: "ALIMENTO",
        food: selectedFood,
        foodMeasure: selectedMeasure ? { label: selectedMeasure.label, grams: selectedMeasure.grams } : null,
        recipe: null,
        choiceGroup: null,
        description: null,
        quantity: quantity ? Number(quantity) : null,
        quantityMax: quantityMax ? Number(quantityMax) : null,
        unit: selectedMeasure ? null : "g",
        quantityText: quantityText || null,
      }
    : null;

  // ---- Aba Receita ----
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes.slice(0, 40);
    const q = recipeSearch.toLowerCase();
    return recipes.filter((r) => r.name.toLowerCase().includes(q) || r.tags?.toLowerCase().includes(q)).slice(0, 40);
  }, [recipes, recipeSearch]);
  const selectedRecipe = useMemo(() => recipes.find((r) => r.id === recipeId) ?? null, [recipes, recipeId]);
  const recipeItemLike: MealOptionItemLike | null = selectedRecipe
    ? {
        itemType: "RECEITA",
        food: null,
        foodMeasure: null,
        recipe: selectedRecipe,
        choiceGroup: null,
        description: null,
        quantity: null,
        quantityMax: null,
        unit: null,
        quantityText: null,
      }
    : null;

  // ---- Aba Grupo de escolha ----
  const [groupId, setGroupId] = useState("");
  const selectedGroup = useMemo(() => choiceGroups.find((g) => g.id === groupId) ?? null, [choiceGroups, groupId]);
  const groupItemLike: MealOptionItemLike | null = selectedGroup
    ? { itemType: "GRUPO_ESCOLHA", food: null, foodMeasure: null, recipe: null, choiceGroup: selectedGroup, description: null, quantity: null, quantityMax: null, unit: null, quantityText: null }
    : null;

  // ---- Aba Texto livre ----
  const [freeText, setFreeText] = useState("");
  const [guidanceSearch, setGuidanceSearch] = useState("");
  const filteredGuidance = useMemo(() => {
    if (!guidanceSearch.trim()) return [];
    const q = guidanceSearch.toLowerCase();
    return guidanceTexts.filter((g) => g.content.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)).slice(0, 10);
  }, [guidanceTexts, guidanceSearch]);

  function resetAll() {
    setFoodSearch("");
    setFoodId("");
    setQuantity("");
    setQuantityMax("");
    setMeasureId("");
    setQuantityText("");
    setRecipeSearch("");
    setRecipeId("");
    setGroupId("");
    setFreeText("");
    setGuidanceSearch("");
    setError(null);
    formRef.current?.reset();
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMealOptionItem(formData);
      handleResult(result, formData);
    });
  }

  function handleResult(result: AddMealOptionItemResult, formData: FormData) {
    if (result.ok) {
      resetAll();
      setOpen(false);
      setConfirmState(null);
      return;
    }
    if ("needsConfirmation" in result) {
      setConfirmState({ field: result.field, term: result.term, itemLabel: result.itemLabel, formData });
      return;
    }
    setError(result.error);
  }

  function confirmAnyway() {
    if (!confirmState) return;
    const fd = confirmState.formData;
    fd.set("restrictionConfirmed", "true");
    startTransition(async () => {
      const result = await addMealOptionItem(fd);
      handleResult(result, fd);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Item
      </button>
    );
  }

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["alimento", "receita", "grupo", "texto"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={t === tab ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            onClick={() => setTab(t)}
          >
            {t === "alimento" ? "Alimento" : t === "receita" ? "Receita" : t === "grupo" ? "Grupo de escolha" : "Texto livre"}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => { resetAll(); setOpen(false); }}>
          Cancelar
        </button>
      </div>

      <form ref={formRef} action={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="hidden" name="mealOptionId" value={mealOptionId} />
        <input type="hidden" name="clientId" value={clientId} />

        {tab === "alimento" && (
          <>
            <input className="input" placeholder="Buscar alimento..." value={foodSearch} onChange={(e) => { setFoodSearch(e.target.value); setFoodId(""); }} />
            {!selectedFood ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {filteredFoods.map((f) => (
                  <button key={f.id} type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => setFoodId(f.id)}>
                    {f.name}
                    {f.nutrientStatus === "PENDENTE" && <span style={{ color: "var(--danger)", marginLeft: 6 }}>(pendente)</span>}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input type="hidden" name="foodId" value={foodId} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.85rem" }}>{selectedFood.baseName}</strong>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFoodId("")}>
                    trocar
                  </button>
                </div>
                {siblingFoods.length > 1 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {siblingFoods.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={s.id === foodId ? "plan-slot-chip plan-slot-chip-active" : "plan-slot-chip"}
                        onClick={() => setFoodId(s.id)}
                      >
                        {FOOD_PREPARATION_LABELS[s.preparation] ?? s.preparation}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input className="input" name="quantity" type="number" step="0.1" placeholder="Qtd" style={{ width: 80 }} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  {selectedFood.measures.length > 0 ? (
                    <select className="input" name="foodMeasureId" style={{ width: 160 }} value={measureId} onChange={(e) => setMeasureId(e.target.value)}>
                      <option value="">Gramas (g)</option>
                      {selectedFood.measures.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.grams} g)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className="input" name="unit" placeholder="g" style={{ width: 80 }} defaultValue="g" />
                  )}
                  <input className="input" name="quantityMax" type="number" step="0.1" placeholder="até (faixa)" style={{ width: 100 }} value={quantityMax} onChange={(e) => setQuantityMax(e.target.value)} />
                </div>
                <input className="input" name="quantityText" placeholder='Ou texto: "A VONTADE", "PONTA DA FACA"...' value={quantityText} onChange={(e) => setQuantityText(e.target.value)} />
                <CalcPreview item={foodItemLike} />
              </>
            )}
          </>
        )}

        {tab === "receita" && (
          <>
            <input className="input" placeholder="Buscar receita..." value={recipeSearch} onChange={(e) => { setRecipeSearch(e.target.value); setRecipeId(""); }} />
            {!selectedRecipe ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {filteredRecipes.map((r) => (
                  <button key={r.id} type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => setRecipeId(r.id)}>
                    {r.name}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input type="hidden" name="recipeId" value={recipeId} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "0.85rem" }}>{selectedRecipe.name}</strong>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRecipeId("")}>trocar</button>
                </div>
                <CalcPreview item={recipeItemLike} />
              </>
            )}
          </>
        )}

        {tab === "grupo" && (
          <>
            <select className="input" name="choiceGroupId" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Selecione um grupo...</option>
              {choiceGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {selectedGroup && (
              <>
                <p className="text-tertiary" style={{ fontSize: "0.78rem" }}>
                  {selectedGroup.items.map((i) => i.food?.name ?? i.description).filter(Boolean).join(" · ")}
                </p>
                <CalcPreview item={groupItemLike} />
              </>
            )}
          </>
        )}

        {tab === "texto" && (
          <>
            <textarea
              className="input"
              name="description"
              rows={2}
              placeholder='Ex: "TOMAR 300 ML DE ÁGUA EM JEJUM"'
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
            />
            <input type="hidden" name="literalText" value={freeText} />
            <input className="input" placeholder="Buscar na Biblioteca de Textos..." value={guidanceSearch} onChange={(e) => setGuidanceSearch(e.target.value)} />
            {filteredGuidance.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                {filteredGuidance.map((g) => (
                  <button key={g.id} type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start", textAlign: "left" }} onClick={() => { setFreeText(g.content); setGuidanceSearch(""); }}>
                    {g.content}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem" }}>{error}</p>}

        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Adicionando..." : "Adicionar item"}
        </button>
      </form>

      {confirmState && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 200, padding: 16 }}>
          <div className="card glass card-pad" style={{ width: "min(420px, 100%)", border: "2px solid var(--danger)" }}>
            <p style={{ fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>⚠ Restrição cadastrada</p>
            <p style={{ fontSize: "0.9rem", marginBottom: 12 }}>
              O paciente tem <strong>{confirmState.term}</strong> registrado em suas restrições, e o item{" "}
              <strong>{confirmState.itemLabel}</strong> pode conflitar. O casamento é por texto e pode errar — confira antes de confirmar.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmState(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-sm" style={{ background: "var(--danger)" }} onClick={confirmAnyway} disabled={isPending}>
                Confirmo a inclusão apesar da restrição registrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
