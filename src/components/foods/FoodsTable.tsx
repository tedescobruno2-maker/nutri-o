import { DeleteFoodButton } from "@/components/foods/DeleteFoodButton";
import { FoodModal } from "@/components/foods/FoodModal";
import { FOOD_PREPARATION_LABELS, NUTRIENT_SOURCE_LABELS } from "@/lib/utils";
import type { getFoodsGrouped } from "@/lib/dal";

type FoodGroup = Awaited<ReturnType<typeof getFoodsGrouped>>[number];

export function FoodsTable({ groups }: { groups: FoodGroup[] }) {
  const rows = groups.flatMap((group) =>
    group.variants.map((food) => ({ food, baseName: group.baseName, hasVariants: group.variants.length > 1 })),
  );

  return (
    <div className="card card-pad">
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Alimento</th>
              <th>Categoria</th>
              <th>kcal/100g</th>
              <th>Prot.</th>
              <th>Carb.</th>
              <th>Gord.</th>
              <th>Fonte</th>
              <th>Medidas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ food, baseName, hasVariants }) => (
              <tr key={food.id}>
                <td>
                  {baseName}
                  {hasVariants && food.preparation !== "NAO_APLICA" && (
                    <span className="text-tertiary" style={{ fontSize: "0.76rem" }}> · {FOOD_PREPARATION_LABELS[food.preparation] ?? food.preparation}</span>
                  )}
                  {food.nutrientStatus === "PENDENTE" && <span className="badge badge-neutral" style={{ marginLeft: 8 }}>Pendente</span>}
                </td>
                <td className="text-muted">{food.category ?? "—"}</td>
                {food.nutrientStatus === "PENDENTE" ? (
                  <td colSpan={4} className="text-tertiary">Sem valor confirmado</td>
                ) : (
                  <>
                    <td className="text-muted">{food.kcal100 ?? "—"}</td>
                    <td className="text-muted">{food.protein100 ?? "—"}g</td>
                    <td className="text-muted">{food.carbs100 ?? "—"}g</td>
                    <td className="text-muted">{food.fat100 ?? "—"}g</td>
                  </>
                )}
                <td className="text-muted">{NUTRIENT_SOURCE_LABELS[food.source] ?? food.source}</td>
                <td className="text-muted">{food.measures.length}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <FoodModal food={food} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
                  <DeleteFoodButton foodId={food.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-tertiary" style={{ fontSize: "0.76rem", marginTop: 10 }}>
        Para cadastrar ou editar medidas caseiras (com sugestão de IA), use a visualização em Cards.
      </p>
    </div>
  );
}
