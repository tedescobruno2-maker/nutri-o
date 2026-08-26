import Link from "next/link";
import type { Recipe, ImageAsset } from "@/generated/prisma/client";
import { MealSlotBadges } from "@/components/ui/MealSlotPicker";

type RecipeWithImage = Recipe & { imageAsset?: ImageAsset | null };

export function RecipesTable({ recipes }: { recipes: RecipeWithImage[] }) {
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
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/recipes/${recipe.id}`} className="btn btn-ghost btn-sm">
                      Ver →
                    </Link>
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
