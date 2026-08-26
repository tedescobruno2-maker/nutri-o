import Link from "next/link";
import { MealSlotBadges } from "@/components/ui/MealSlotPicker";
import { RecipeModal, type RecipeForEdit } from "@/components/recipes/RecipeModal";
import { DeleteRecipeButton } from "@/components/recipes/DeleteRecipeButton";
import type { Food } from "@/generated/prisma/client";

export function RecipesTable({ recipes, foods }: { recipes: RecipeForEdit[]; foods: Food[] }) {
  return (
    <div className="card card-pad">
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Receita</th>
              <th>kcal</th>
              <th>Prot.</th>
              <th>Carb.</th>
              <th>Gord.</th>
              <th>Tags</th>
              <th>Horários</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe) => {
              const tags = recipe.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
              return (
                <tr key={recipe.id}>
                  <td>
                    {recipe.name}
                    {recipe.isExtra && <span className="badge badge-warm" style={{ marginLeft: 8 }}>Extra</span>}
                  </td>
                  {recipe.calories == null ? (
                    <td colSpan={4} className="text-tertiary">Macros pendentes</td>
                  ) : (
                    <>
                      <td className="text-muted">{recipe.calories}</td>
                      <td className="text-muted">{recipe.protein ?? "—"}g</td>
                      <td className="text-muted">{recipe.carbs ?? "—"}g</td>
                      <td className="text-muted">{recipe.fat ?? "—"}g</td>
                    </>
                  )}
                  <td className="text-muted" style={{ fontSize: "0.78rem" }}>{tags.slice(0, 3).join(", ") || "—"}</td>
                  <td><MealSlotBadges mealSlots={recipe.mealSlots} /></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link href={`/recipes/${recipe.id}`} className="btn btn-ghost btn-sm">
                      Ver →
                    </Link>
                    <RecipeModal recipe={recipe} foods={foods} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
                    <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
