import { getFoodsGrouped, getFoodCategories } from "@/lib/dal";
import { FoodModal } from "@/components/foods/FoodModal";
import { FoodsView } from "@/components/foods/FoodsView";

export default async function FoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const { q, categoria } = await searchParams;
  const [groups, categories] = await Promise.all([getFoodsGrouped(q, categoria), getFoodCategories()]);
  const totalFoods = groups.reduce((sum, g) => sum + g.variants.length, 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Banco de Alimentos</h1>
          <p className="text-muted">
            {groups.length} alimento(s)-base · {totalFoods} variante(s) de preparo · valores por 100g.
          </p>
        </div>
        <FoodModal trigger={<span className="btn btn-primary">+ Novo alimento</span>} />
      </div>

      <form method="GET" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input className="input" type="search" name="q" placeholder="Buscar alimento..." defaultValue={q ?? ""} style={{ maxWidth: 320, flex: 1 }} />
        <select className="input" name="categoria" defaultValue={categoria ?? ""} style={{ maxWidth: 220 }}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-ghost">
          Filtrar
        </button>
      </form>

      {groups.length === 0 ? (
        <div className="card empty-state">
          <span style={{ fontSize: "2rem" }}>🥕</span>
          <p>Nenhum alimento encontrado.</p>
        </div>
      ) : (
        <FoodsView groups={groups} />
      )}
    </div>
  );
}
