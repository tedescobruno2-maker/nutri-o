"use client";

import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipesTable } from "@/components/recipes/RecipesTable";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import type { Recipe, ImageAsset } from "@/generated/prisma/client";

type RecipeWithImage = Recipe & { imageAsset?: ImageAsset | null };

export function RecipesView({ recipes }: { recipes: RecipeWithImage[] }) {
  const [mode, setMode] = useViewMode("view-mode:receitas");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "table" ? (
        <RecipesTable recipes={recipes} />
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
