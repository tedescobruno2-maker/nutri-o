import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecipeById } from "@/lib/dal";
import { pickRecipeEmoji } from "@/lib/utils";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) notFound();

  const tags = recipe.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
  const hasMacros = recipe.protein != null && recipe.carbs != null && recipe.fat != null;
  const imageSrc = recipe.imageAsset?.url ?? recipe.imageUrl;

  return (
    <div className="animate-in">
      <Link href="/recipes" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Voltar para receitas
      </Link>

      <div className="recipe-hero">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={recipe.imageAsset?.altText ?? recipe.name} className="recipe-hero-media" />
        ) : (
          <div className="recipe-hero-media recipe-hero-placeholder">{pickRecipeEmoji(recipe.name, recipe.tags)}</div>
        )}
        <div className="recipe-hero-overlay">
          {(tags.length > 0 || recipe.isExtra) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {recipe.isExtra && (
                <span className="badge badge-warm" style={{ background: "oklch(1 0 0 / 0.85)" }}>Receita extra</span>
              )}
              {tags.map((tag) => (
                <span key={tag} className="badge badge-neutral" style={{ background: "oklch(1 0 0 / 0.85)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 style={{ color: "white", textShadow: "0 2px 12px oklch(0 0 0 / 0.5)" }}>{recipe.name}</h1>
          {recipe.description && (
            <p style={{ color: "white", textShadow: "0 1px 8px oklch(0 0 0 / 0.5)", maxWidth: 560 }}>
              {recipe.description}
            </p>
          )}
        </div>
      </div>

      <p className="text-muted" style={{ marginTop: 12, fontSize: "0.85rem", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {recipe.servings != null && <span>🍽️ {recipe.servings} porção(ões)</span>}
        {recipe.prepTimeMin != null && <span>⏱️ {recipe.prepTimeMin} min de preparo</span>}
        {recipe.mealCategory && <span>📂 {recipe.mealCategory}</span>}
      </p>

      {recipe.calories != null || hasMacros ? (
        <section className="section stat-grid" style={{ marginTop: 24 }}>
          {recipe.calories != null && (
            <div className="card glass stat-tile">
              <div className="stat-icon badge-warm">🔥</div>
              <div className="stat-value">{recipe.calories}</div>
              <div className="stat-label">Calorias (kcal)</div>
            </div>
          )}
          {hasMacros && (
            <>
              <div className="card glass stat-tile">
                <div className="stat-icon" style={{ background: "color-mix(in oklch, var(--viz-series-1) 15%, transparent)" }}>🥩</div>
                <div className="stat-value">{recipe.protein}g</div>
                <div className="stat-label">Proteína</div>
              </div>
              <div className="card glass stat-tile">
                <div className="stat-icon" style={{ background: "color-mix(in oklch, var(--viz-series-2) 15%, transparent)" }}>🌾</div>
                <div className="stat-value">{recipe.carbs}g</div>
                <div className="stat-label">Carboidrato</div>
              </div>
              <div className="card glass stat-tile">
                <div className="stat-icon" style={{ background: "color-mix(in oklch, var(--viz-series-3) 15%, transparent)" }}>🥑</div>
                <div className="stat-value">{recipe.fat}g</div>
                <div className="stat-label">Gordura</div>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="section">
          <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge badge-warm">Macros pendentes</span>
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              Vincule alimentos do banco aos ingredientes para calcular calorias e macros automaticamente.
            </span>
          </div>
        </section>
      )}

      {recipe.legacyMacrosNote && (
        <section className="section">
          <div className="card card-pad">
            <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>
              Valor digitado antes do cálculo automático (Fase 10), para comparação: {recipe.legacyMacrosNote}
            </span>
          </div>
        </section>
      )}

      <section className="section chart-grid-2">
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16 }}>Ingredientes</h3>
          {recipe.ingredientItems.length > 0 ? (
            <ul className="ingredient-list">
              {recipe.ingredientItems.map((item) => (
                <li key={item.id} className="ingredient-row">
                  <span className="ingredient-bullet" aria-hidden>
                    {item.food ? "●" : "·"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ingredient-main">
                      {item.quantity != null && (
                        <strong>
                          {item.quantity} {item.unit}{" "}
                        </strong>
                      )}
                      {item.food ? item.food.name : item.description}
                    </div>
                    {item.food && item.food.kcal100 != null && (
                      <div className="ingredient-meta">
                        {item.food.kcal100} kcal · P {item.food.protein100}g · C {item.food.carbs100}g · G {item.food.fat100}g{" "}
                        <span className="text-tertiary">(por 100{item.food.defaultUnit === "ml" ? "ml" : "g"})</span>
                      </div>
                    )}
                    {item.food && item.food.kcal100 == null && (
                      <div className="ingredient-meta text-tertiary">Alimento pendente (sem valor nutricional confirmado)</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.7 }}>{recipe.ingredients}</p>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 16 }}>Modo de preparo</h3>
          {recipe.instructions ? (
            <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.7 }}>{recipe.instructions}</p>
          ) : (
            <p className="text-tertiary">Modo de preparo não informado.</p>
          )}
        </div>
      </section>
    </div>
  );
}
