"use client";

import { useMemo, useState } from "react";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import { SearchCategoryFilter } from "@/components/ui/SearchCategoryFilter";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { SupplementModal } from "@/components/suplementos/SupplementModal";
import { SupplementBrandModal } from "@/components/suplementos/SupplementBrandModal";
import { SupplementProductModal } from "@/components/suplementos/SupplementProductModal";
import { CompoundedFormulaModal } from "@/components/suplementos/CompoundedFormulaModal";
import { deleteSupplement, deleteSupplementBrand, deleteSupplementProduct, deleteCompoundedFormula } from "@/actions/supplements";
import type { getSupplementCatalog } from "@/lib/dal";

type Catalog = Awaited<ReturnType<typeof getSupplementCatalog>>;

const ORIGIN_LABELS: Record<string, string> = {
  LOJA_SUPLEMENTOS: "Loja de suplementos",
  MANIPULADO: "Manipulado",
  AMBOS: "Loja e manipulado",
};

export function SupplementsView({ actives, archivedCount, brands, formulas }: Catalog) {
  const [mode, setMode] = useViewMode("view-mode:suplementos");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const hasFilter = query.trim() !== "" || category !== "";

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of actives) if (a.category) set.add(a.category);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [actives]);

  const filteredActives = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actives.filter((a) => {
      if (category && a.category !== category) return false;
      if (q && !a.activeName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [actives, category, query]);

  const filteredBrands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands
      .map((brand) => ({
        ...brand,
        products: brand.products.filter((p) => {
          if (category && p.supplement.category !== category) return false;
          if (q && !p.commercialName.toLowerCase().includes(q) && !brand.name.toLowerCase().includes(q) && !p.supplement.activeName.toLowerCase().includes(q)) return false;
          return true;
        }),
      }))
      .filter((brand) => !hasFilter || brand.products.length > 0);
  }, [brands, category, query, hasFilter]);

  const filteredFormulas = useMemo(() => {
    // Fórmulas não têm categoria — só entram no filtro por categoria quando nenhuma está selecionada.
    if (category) return [];
    const q = query.trim().toLowerCase();
    if (!q) return formulas;
    return formulas.filter((f) => f.name.toLowerCase().includes(q) || f.items.some((item) => item.activeName.toLowerCase().includes(q)));
  }, [formulas, category, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SearchCategoryFilter
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        searchPlaceholder="Buscar suplemento..."
      />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Ativos</h3>
            <SupplementModal trigger={<span className="btn btn-primary btn-sm">+ Novo ativo</span>} />
          </div>
          {archivedCount > 0 && (
            <p className="text-tertiary" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
              {archivedCount} suplemento(s) legado(s) ou arquivado(s) (registros livres de pacientes antes da Fase 6, ou removidos por aqui) — ainda ligados às prescrições antigas, sem aparecer aqui.
            </p>
          )}
          {hasFilter && filteredActives.length === 0 && (
            <p className="text-tertiary" style={{ fontSize: "0.82rem" }}>Nenhum ativo encontrado.</p>
          )}

          {mode === "table" ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome do ativo</th>
                    <th>Categoria</th>
                    <th>Dose padrão</th>
                    <th>Horário padrão</th>
                    <th>Origem</th>
                    <th>Marcas cadastradas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActives.map((a) => (
                    <tr key={a.id}>
                      <td>{a.activeName}</td>
                      <td className="text-muted">{a.category ?? "—"}</td>
                      <td className="text-muted">{a.defaultDose ?? "—"}</td>
                      <td className="text-muted">{a.defaultTiming ?? "—"}</td>
                      <td className="text-muted">{ORIGIN_LABELS[a.origin]}</td>
                      <td className="text-muted">{a._count.products}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <SupplementModal supplement={a} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
                        <ConfirmActionButton label="Remover" confirmText={`Arquivar o ativo "${a.activeName}"?`} onConfirm={() => deleteSupplement(a.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {filteredActives.map((a) => (
                <div key={a.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{a.activeName}</strong>
                  <p className="text-tertiary" style={{ fontSize: "0.76rem", marginTop: 2 }}>{a.category ?? "Sem categoria"}</p>
                  <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>{a.defaultDose ?? "Dose não definida"}</p>
                  <p className="text-muted" style={{ fontSize: "0.8rem" }}>{a.defaultTiming ?? "Horário não definido"}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>{ORIGIN_LABELS[a.origin]}</span>
                    <span className="text-tertiary" style={{ fontSize: "0.74rem" }}>{a._count.products} marca(s)</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                    <SupplementModal supplement={a} trigger={<span className="btn btn-ghost btn-sm">✎ Editar</span>} />
                    <ConfirmActionButton label="Remover" confirmText={`Arquivar o ativo "${a.activeName}"?`} onConfirm={() => deleteSupplement(a.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Marcas e produtos</h3>
            <SupplementBrandModal trigger={<span className="btn btn-primary btn-sm">+ Nova marca</span>} />
          </div>
          {hasFilter && filteredBrands.length === 0 && (
            <p className="text-tertiary" style={{ fontSize: "0.82rem" }}>Nenhuma marca/produto encontrado.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredBrands.map((brand) => (
              <div key={brand.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.9rem" }}>{brand.name}</strong>
                  <div style={{ display: "flex", gap: 4 }}>
                    <SupplementProductModal actives={actives} brands={brands} defaultBrandId={brand.id} trigger={<span className="btn btn-ghost btn-sm">+ Produto</span>} />
                    <SupplementBrandModal brand={brand} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
                    {brand.products.length === 0 && (
                      <ConfirmActionButton label="Remover" confirmText={`Remover a marca "${brand.name}"?`} onConfirm={() => deleteSupplementBrand(brand.id)} />
                    )}
                  </div>
                </div>
                {brand.products.length === 0 ? (
                  <p className="text-tertiary" style={{ fontSize: "0.8rem", marginTop: 4 }}>Nenhum produto cadastrado.</p>
                ) : mode === "table" ? (
                  <div style={{ overflowX: "auto", marginTop: 6 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Ativo</th>
                          <th>Apresentação</th>
                          <th>Sabores</th>
                          <th>Dose no rótulo</th>
                          <th>Tabela nutricional</th>
                          <th>Origem do dado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {brand.products.map((p) => (
                          <tr key={p.id}>
                            <td>{p.commercialName}</td>
                            <td className="text-muted">{p.supplement.activeName}</td>
                            <td className="text-muted">{p.presentation ?? "—"}</td>
                            <td className="text-muted">{p.flavors ?? "—"}</td>
                            <td className="text-muted">{p.doseLabel ?? "—"}</td>
                            <td className="text-muted">{p.nutritionJson ? "Impressa no rótulo" : "Pendente (rótulo não traz)"}</td>
                            <td className="text-tertiary" style={{ fontSize: "0.76rem" }}>{p.sourceRef ?? "—"}</td>
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <SupplementProductModal product={p} actives={actives} brands={brands} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
                              <ConfirmActionButton label="Remover" confirmText={`Arquivar o produto "${p.commercialName}"?`} onConfirm={() => deleteSupplementProduct(p.id)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 8 }}>
                    {brand.products.map((p) => (
                      <div key={p.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                        <strong style={{ fontSize: "0.84rem" }}>{p.commercialName}</strong>
                        <p className="text-tertiary" style={{ fontSize: "0.74rem", marginTop: 2 }}>{p.supplement.activeName}</p>
                        <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>{p.presentation ?? "Apresentação não informada"}</p>
                        {p.flavors && <p className="text-muted" style={{ fontSize: "0.78rem" }}>Sabores: {p.flavors}</p>}
                        <p className="text-muted" style={{ fontSize: "0.78rem" }}>{p.doseLabel ?? "Dose no rótulo não informada"}</p>
                        <span className="badge badge-neutral" style={{ fontSize: "0.66rem", marginTop: 6, display: "inline-block" }}>
                          {p.nutritionJson ? "Tabela impressa no rótulo" : "Tabela pendente"}
                        </span>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                          <SupplementProductModal product={p} actives={actives} brands={brands} trigger={<span className="btn btn-ghost btn-sm">✎ Editar</span>} />
                          <ConfirmActionButton label="Remover" confirmText={`Arquivar o produto "${p.commercialName}"?`} onConfirm={() => deleteSupplementProduct(p.id)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Fórmulas manipuladas</h3>
            <CompoundedFormulaModal actives={actives} trigger={<span className="btn btn-primary btn-sm">+ Nova fórmula</span>} />
          </div>
          {hasFilter && filteredFormulas.length === 0 && (
            <p className="text-tertiary" style={{ fontSize: "0.82rem" }}>Nenhuma fórmula encontrada.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredFormulas.map((f) => (
              <div key={f.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.9rem" }}>{f.name}</strong>
                  <div style={{ display: "flex", gap: 4 }}>
                    <CompoundedFormulaModal formula={f} actives={actives} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
                    <ConfirmActionButton label="Remover" confirmText={`Remover a fórmula "${f.name}"?`} onConfirm={() => deleteCompoundedFormula(f.id)} />
                  </div>
                </div>
                <p className="text-muted" style={{ fontSize: "0.8rem", margin: "4px 0" }}>{f.presentation}</p>
                <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: 6 }}>{f.posology}</p>
                <ul style={{ paddingLeft: 18, listStyle: "disc", fontSize: "0.82rem" }}>
                  {f.items.map((item) => (
                    <li key={item.id}>{item.activeName} — {item.quantity}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
