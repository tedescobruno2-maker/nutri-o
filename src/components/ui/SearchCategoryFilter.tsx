"use client";

/** Busca por texto + filtro por categoria, com botão de limpar — mesmo padrão já usado em
 * Alimentos, agora reutilizável em Receitas/Suplementos/Biblioteca de Textos. */
export function SearchCategoryFilter({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  categoryLabels,
  searchPlaceholder = "Buscar...",
}: {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  categoryLabels?: Record<string, string>;
  searchPlaceholder?: string;
}) {
  const hasFilter = query.trim() !== "" || category !== "";

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input
        className="input"
        type="search"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        style={{ maxWidth: 320, flex: 1 }}
      />
      <select className="input" value={category} onChange={(e) => onCategoryChange(e.target.value)} style={{ maxWidth: 220 }}>
        <option value="">Todas as categorias</option>
        {categories.map((c) => (
          <option key={c} value={c}>{categoryLabels?.[c] ?? c}</option>
        ))}
      </select>
      {hasFilter && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onQueryChange("");
            onCategoryChange("");
          }}
        >
          ✕ Limpar filtro
        </button>
      )}
    </div>
  );
}
