"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipesTable } from "@/components/recipes/RecipesTable";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import { PLAN_SLOTS, PLAN_SLOT_SHORT } from "@/lib/planSlots";
import type { Recipe, ImageAsset } from "@/generated/prisma/client";

type RecipeWithImage = Recipe & { imageAsset?: ImageAsset | null };

export function RecipesView({ recipes }: { recipes: RecipeWithImage[] }) {
  const [mode, setMode] = useViewMode("view-mode:receitas");
  const [slotFilter, setSlotFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!slotFilter) return recipes;
    return recipes.filter((r) => (r.mealSlots ?? "").split(",").map((s) => s.trim()).includes(slotFilter));
  }, [recipes, slotFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PLAN_SLOTS.map((slot) => {
            const active = slotFilter === slot;
            return (
              <button
                key={slot}
                type="button"
                className={active ? "plan-slot-chip plan-slot-chip-active" : "plan-slot-chip"}
                onClick={() => setSlotFilter(active ? null : slot)}
              >
                {PLAN_SLOT_SHORT[slot]}
              </button>
            );
          })}
        </div>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <span style={{ fontSize: "2rem" }}>🍽️</span>
          <p>Nenhuma receita marcada para esse horário ainda.</p>
        </div>
      ) : mode === "table" ? (
        <RecipesTable recipes={filtered} />
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
