import { getRecipesWithIngredients, getFoods } from "@/lib/dal";
import { RecipesView } from "@/components/recipes/RecipesView";
import { RecipeModal } from "@/components/recipes/RecipeModal";

export default async function RecipesPage() {
  const [recipes, foods] = await Promise.all([getRecipesWithIngredients(), getFoods()]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Receitas</h1>
          <p className="text-muted">{recipes.length} receita(s) no acervo.</p>
        </div>
        <RecipeModal foods={foods} trigger={<span className="btn btn-primary">+ Nova receita</span>} />
      </div>

      {recipes.length === 0 ? (
        <div className="card empty-state">
          <span style={{ fontSize: "2rem" }}>🍽️</span>
          <p>Nenhuma receita cadastrada ainda.</p>
        </div>
      ) : (
        <RecipesView recipes={recipes} foods={foods} />
      )}
    </div>
  );
}
