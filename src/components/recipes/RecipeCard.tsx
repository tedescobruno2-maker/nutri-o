import Link from "next/link";
import type { Recipe, ImageAsset } from "@/generated/prisma/client";
import { pickRecipeEmoji } from "@/lib/utils";
import { MealSlotBadges } from "@/components/ui/MealSlotPicker";

export function RecipeCard({ recipe }: { recipe: Recipe & { imageAsset?: ImageAsset | null } }) {
  const hasMacros = recipe.protein != null && recipe.carbs != null && recipe.fat != null;
  const total = hasMacros ? (recipe.protein! + recipe.carbs! + recipe.fat!) || 1 : 1;
  const proteinPct = hasMacros ? Math.round((recipe.protein! / total) * 100) : 0;
  const carbsPct = hasMacros ? Math.round((recipe.carbs! / total) * 100) : 0;
  const fatPct = hasMacros ? Math.max(0, 100 - proteinPct - carbsPct) : 0;
  const tags = recipe.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const imageSrc = recipe.imageAsset?.url ?? recipe.imageUrl;

  return (
    <Link href={`/recipes/${recipe.id}`} className="recipe-card card card-hover animate-in">
      <div className="recipe-media-wrap">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={recipe.imageAsset?.altText ?? recipe.name} className="recipe-media" />
        ) : (
          <div
            className="recipe-media recipe-media-placeholder"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary-soft), color-mix(in oklch, var(--accent-warm) 25%, var(--accent-primary-soft)))",
            }}
          >
            {pickRecipeEmoji(recipe.name, recipe.tags)}
          </div>
        )}
        {recipe.calories != null && <span className="recipe-kcal-chip">{recipe.calories} kcal</span>}
      </div>

      <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div>
          <h3>{recipe.name}</h3>
          {recipe.description && <p className="text-muted" style={{ fontSize: "0.85rem" }}>{recipe.description}</p>}
        </div>

        {(recipe.isExtra || recipe.calories == null || tags.length > 0) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {recipe.isExtra && <span className="badge badge-warm">Extra</span>}
            {recipe.calories == null && <span className="badge badge-neutral">Macros pendentes</span>}
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge badge-neutral">
                {tag}
              </span>
            ))}
          </div>
        )}

        {hasMacros && (
          <>
            <div className="macro-bar" title={`Proteína ${proteinPct}% · Carbo ${carbsPct}% · Gordura ${fatPct}%`}>
              <span style={{ width: `${proteinPct}%`, background: "var(--viz-series-1)" }} />
              <span style={{ width: `${carbsPct}%`, background: "var(--viz-series-2)" }} />
              <span style={{ width: `${fatPct}%`, background: "var(--viz-series-3)" }} />
            </div>
            <div className="chart-legend" style={{ fontSize: "0.7rem" }}>
              <span className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: "var(--viz-series-1)" }} />P {recipe.protein}g
              </span>
              <span className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: "var(--viz-series-2)" }} />C {recipe.carbs}g
              </span>
              <span className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: "var(--viz-series-3)" }} />G {recipe.fat}g
              </span>
            </div>
          </>
        )}

        <MealSlotBadges mealSlots={recipe.mealSlots} />

        <span className="recipe-card-cta">Ver receita completa →</span>
      </div>
    </Link>
  );
}
