import type { Recipe } from "@/generated/prisma/client";

const EMOJI_RULES: Array<[RegExp, string]> = [
  [/salmão|peixe|atum|ômega|tilápia|linguado/i, "🐟"],
  [/frango|peito de frango/i, "🍗"],
  [/ovo|omelete|clara/i, "🥚"],
  [/smoothie|suco|shake|vitamina/i, "🥤"],
  [/panqueca|aveia|banana/i, "🥞"],
  [/salada|grão-de-bico|legum/i, "🥗"],
  [/quinoa|bowl/i, "🍲"],
  [/hambúrguer|hamburguer|carne/i, "🍔"],
  [/sopa|caldo/i, "🍜"],
  [/lasanha|berinjela|abobrinha/i, "🍆"],
  [/granola|semente/i, "🌾"],
  [/molho/i, "🫙"],
];

function pickEmoji(recipe: Pick<Recipe, "name" | "tags">) {
  const haystack = `${recipe.name} ${recipe.tags ?? ""}`;
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(haystack)) return emoji;
  }
  return "🍽️";
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const hasMacros = recipe.protein != null && recipe.carbs != null && recipe.fat != null;
  const total = hasMacros ? (recipe.protein! + recipe.carbs! + recipe.fat!) || 1 : 1;
  const proteinPct = hasMacros ? Math.round((recipe.protein! / total) * 100) : 0;
  const carbsPct = hasMacros ? Math.round((recipe.carbs! / total) * 100) : 0;
  const fatPct = hasMacros ? Math.max(0, 100 - proteinPct - carbsPct) : 0;
  const tags = recipe.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <div className="card card-hover animate-in" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {recipe.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.imageUrl} alt={recipe.name} className="recipe-media" style={{ objectFit: "cover", fontSize: 0 }} />
      ) : (
        <div
          className="recipe-media"
          style={{
            background: "linear-gradient(135deg, var(--accent-primary-soft), color-mix(in oklch, var(--accent-warm) 25%, var(--accent-primary-soft)))",
          }}
        >
          {pickEmoji(recipe)}
        </div>
      )}

      <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div>
          <h3>{recipe.name}</h3>
          {recipe.description && <p className="text-muted" style={{ fontSize: "0.85rem" }}>{recipe.description}</p>}
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.map((tag) => (
              <span key={tag} className="badge badge-neutral">
                {tag}
              </span>
            ))}
          </div>
        )}

        {recipe.calories != null && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="stat-value" style={{ fontSize: "1.3rem" }}>
              {recipe.calories}
            </span>
            <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>
              kcal
            </span>
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
      </div>
    </div>
  );
}
