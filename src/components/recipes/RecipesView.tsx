"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipesTable } from "@/components/recipes/RecipesTable";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import { SearchCategoryFilter } from "@/components/ui/SearchCategoryFilter";
import { PLAN_SLOTS, PLAN_SLOT_SHORT } from "@/lib/planSlots";
import { MEAL_CATEGORIES, type RecipeForEdit } from "@/components/recipes/RecipeModal";
import type { Food } from "@/generated/prisma/client";

const CATEGORY_VALUES = MEAL_CATEGORIES.filter((c) => c.value).map((c) => c.value);
const CATEGORY_LABELS = Object.fromEntries(MEAL_CATEGORIES.filter((c) => c.value).map((c) => [c.value, c.label]));

export function RecipesView({ recipes, foods }: { recipes: RecipeForEdit[]; foods: Food[] }) {
  const [mode, setMode] = useViewMode("view-mode:receitas");
  const [slotFilter, setSlotFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (slotFilter && !(r.mealSlots ?? "").split(",").map((s) => s.trim()).includes(slotFilter)) return false;
      if (category && r.mealCategory !== category) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.tags ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recipes, slotFilter, category, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SearchCategoryFilter
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        categories={CATEGORY_VALUES}
        categoryLabels={CATEGORY_LABELS}
        searchPlaceholder="Buscar receita..."
      />

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
          <p>Nenhuma receita encontrada.</p>
        </div>
      ) : mode === "table" ? (
        <RecipesTable recipes={filtered} foods={foods} />
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} foods={foods} />
          ))}
        </div>
      )}
    </div>
  );
}
