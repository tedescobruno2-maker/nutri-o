import { getSupplementCatalog } from "@/lib/dal";

const ORIGIN_LABELS: Record<string, string> = {
  LOJA_SUPLEMENTOS: "Loja de suplementos",
  MANIPULADO: "Manipulado",
  AMBOS: "Loja e manipulado",
};

export default async function SuplementosPage() {
  const { actives, archivedCount, brands, formulas } = await getSupplementCatalog();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Suplementos</h1>
          <p className="text-muted">Catálogo de ativos, marcas/produtos e fórmulas manipuladas (Fase 6).</p>
        </div>
      </div>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Ativos</h3>
          </div>
          {archivedCount > 0 && (
            <p className="text-tertiary" style={{ fontSize: "0.78rem", marginBottom: 8 }}>
              {archivedCount} suplemento(s) legado(s) (registros livres de pacientes antes da Fase 6) arquivado(s) — ainda ligados às prescrições antigas, sem aparecer aqui.
            </p>
          )}
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
                </tr>
              </thead>
              <tbody>
                {actives.map((a) => (
                  <tr key={a.id}>
                    <td>{a.activeName}</td>
                    <td className="text-muted">{a.category ?? "—"}</td>
                    <td className="text-muted">{a.defaultDose ?? "—"}</td>
                    <td className="text-muted">{a.defaultTiming ?? "—"}</td>
                    <td className="text-muted">{ORIGIN_LABELS[a.origin]}</td>
                    <td className="text-muted">{a._count.products}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card card-pad">
          <div className="chart-card-header">
            <h3>Marcas e produtos</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {brands.map((brand) => (
              <div key={brand.id}>
                <strong style={{ fontSize: "0.9rem" }}>{brand.name}</strong>
                {brand.products.length === 0 ? (
                  <p className="text-tertiary" style={{ fontSize: "0.8rem", marginTop: 4 }}>Nenhum produto cadastrado.</p>
                ) : (
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {formulas.map((f) => (
              <div key={f.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ fontSize: "0.9rem" }}>{f.name}</strong>
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
