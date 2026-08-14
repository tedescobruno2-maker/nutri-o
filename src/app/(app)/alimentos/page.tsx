import { getFoods } from "@/lib/dal";
import { NewFoodButton } from "@/components/foods/NewFoodButton";
import { DeleteFoodButton } from "@/components/foods/DeleteFoodButton";

export default async function FoodsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const foods = await getFoods(q);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Banco de Alimentos</h1>
          <p className="text-muted">{foods.length} alimento(s) cadastrado(s) · valores por 100g.</p>
        </div>
        <NewFoodButton />
      </div>

      <form method="GET" style={{ marginBottom: 20, maxWidth: 360 }}>
        <input className="input" type="search" name="q" placeholder="Buscar alimento..." defaultValue={q ?? ""} />
      </form>

      <div className="card">
        {foods.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>🥕</span>
            <p>Nenhum alimento encontrado.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Categoria</th>
                <th>Kcal</th>
                <th>Proteína</th>
                <th>Carbo</th>
                <th>Gordura</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {foods.map((food) => (
                <tr key={food.id}>
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {food.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={food.imageUrl}
                          alt={food.name}
                          style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "var(--radius-sm)",
                            background: "var(--accent-primary-soft)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        >
                          🥕
                        </div>
                      )}
                      {food.name}
                    </div>
                  </td>
                  <td className="text-muted">{food.category || "—"}</td>
                  <td>{food.kcal100}</td>
                  <td>{food.protein100}g</td>
                  <td>{food.carbs100}g</td>
                  <td>{food.fat100}g</td>
                  <td>
                    <DeleteFoodButton foodId={food.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
