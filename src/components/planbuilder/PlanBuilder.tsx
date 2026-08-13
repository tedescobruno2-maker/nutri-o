"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMealPlanFromRecipes } from "@/actions/planBuilder";
import { PLAN_SLOTS } from "@/lib/planSlots";
import { pickRecipeEmoji } from "@/lib/utils";
import type { Client, Recipe } from "@/generated/prisma/client";

type ClientBasic = Pick<Client, "id" | "name" | "goal" | "status">;

const SLOT_SHORT: Record<string, string> = {
  Desjejum: "Café",
  "Lanche da Manhã": "Manhã",
  Almoço: "Almoço",
  "Lanche da Tarde": "Tarde",
  Jantar: "Jantar",
  Ceia: "Ceia",
};

export function PlanBuilder({
  clients,
  recipes,
  initialClientId,
}: {
  clients: ClientBasic[];
  recipes: Recipe[];
  initialClientId?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [title, setTitle] = useState("Plano Alimentar");
  const [objective, setObjective] = useState("");
  const [search, setSearch] = useState("");
  const [slots, setSlots] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter((r) => r.name.toLowerCase().includes(q) || r.tags?.toLowerCase().includes(q));
  }, [recipes, search]);

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const totalSelected = Object.values(slots).reduce((sum, arr) => sum + arr.length, 0);

  function toggleRecipeInSlot(slotName: string, recipeId: string) {
    setSlots((prev) => {
      const current = prev[slotName] ?? [];
      const next = current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId];
      return { ...prev, [slotName]: next };
    });
  }

  function removeFromSlot(slotName: string, recipeId: string) {
    setSlots((prev) => ({ ...prev, [slotName]: (prev[slotName] ?? []).filter((id) => id !== recipeId) }));
  }

  function handleSave() {
    setError(null);
    if (!clientId) {
      setError("Selecione um paciente.");
      return;
    }
    const activeSlots = PLAN_SLOTS.filter((s) => (slots[s]?.length ?? 0) > 0).map((name) => ({
      name,
      recipeIds: slots[name],
    }));
    if (activeSlots.length === 0) {
      setError("Adicione pelo menos uma receita a alguma refeição.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createMealPlanFromRecipes({ clientId, title, objective: objective || undefined, slots: activeSlots });
        router.push(`/planos/${result.mealPlanId}/exportar`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar o plano.");
      }
    });
  }

  return (
    <div className="plan-builder">
      <div className="plan-builder-main">
        <input
          className="input"
          type="search"
          placeholder="Buscar receita por nome ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        <div className="plan-recipe-grid">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="card plan-recipe-card">
              <div className="plan-recipe-media-wrap">
                {recipe.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={recipe.imageUrl} alt={recipe.name} className="plan-recipe-media" />
                ) : (
                  <div className="plan-recipe-media plan-recipe-media-placeholder">
                    {pickRecipeEmoji(recipe.name, recipe.tags)}
                  </div>
                )}
              </div>
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>{recipe.name}</div>
                {recipe.calories != null && (
                  <div className="text-tertiary" style={{ fontSize: "0.72rem", marginBottom: 8 }}>
                    {recipe.calories} kcal
                  </div>
                )}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {PLAN_SLOTS.map((slot) => {
                    const active = (slots[slot] ?? []).includes(recipe.id);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={active ? "plan-slot-chip plan-slot-chip-active" : "plan-slot-chip"}
                        onClick={() => toggleRecipeInSlot(slot, recipe.id)}
                        title={`${active ? "Remover de" : "Adicionar a"} ${slot}`}
                      >
                        {active ? "✓ " : "+ "}
                        {SLOT_SHORT[slot]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="plan-builder-sidebar">
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 90 }}>
          <h3>Plano em construção</h3>

          <div className="field">
            <label htmlFor="pb-client">Paciente</label>
            <select id="pb-client" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="pb-title">Título do plano</label>
            <input id="pb-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="pb-objective">Objetivo (opcional)</label>
            <textarea
              id="pb-objective"
              className="input"
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex: Redução de gordura, preservando massa muscular."
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {totalSelected === 0 && (
              <p className="text-tertiary" style={{ fontSize: "0.82rem" }}>
                Clique nos botões de refeição nos cards das receitas para adicionar ao plano.
              </p>
            )}
            {PLAN_SLOTS.filter((s) => (slots[s]?.length ?? 0) > 0).map((slot) => (
              <div key={slot}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {slot}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {slots[slot].map((recipeId) => {
                    const recipe = recipeById.get(recipeId);
                    if (!recipe) return null;
                    return (
                      <div key={recipeId} className="plan-summary-item">
                        <span>{recipe.name}</span>
                        <button type="button" className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => removeFromSlot(slot, recipeId)}>
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem" }}>{error}</p>}

          <button type="button" className="btn btn-primary" disabled={isPending} onClick={handleSave}>
            {isPending ? "Salvando..." : `Salvar plano (${totalSelected} receita${totalSelected === 1 ? "" : "s"})`}
          </button>
        </div>
      </aside>
    </div>
  );
}
