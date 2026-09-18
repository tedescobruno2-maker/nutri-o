import type { IntegrationStatus } from "@/lib/integrationStatus";

export function IntegrationStatusPanel({ statuses }: { statuses: IntegrationStatus[] }) {
  const missing = statuses.filter((s) => !s.configured);

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="chart-card-header">
        <h3>Diagnóstico do servidor</h3>
      </div>

      {missing.length === 0 ? (
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
          ✅ Todas as integrações estão configuradas neste ambiente.
        </p>
      ) : (
        <p style={{ fontSize: "0.85rem", color: "var(--danger)" }}>
          {missing.length} integração(ões) sem configuração — os recursos abaixo ficam indisponíveis até a variável
          ser cadastrada no provedor de hospedagem (Vercel → Settings → Environment Variables) e um novo deploy sair.
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Integração</th>
              <th>Status</th>
              <th>Variável</th>
              <th>O que depende dela</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.label}>
                <td>{s.label}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {s.configured ? (
                    <span className="badge badge-success">✓ Configurada</span>
                  ) : (
                    <span className="badge badge-warm">✗ Ausente</span>
                  )}
                </td>
                <td className="text-tertiary" style={{ fontSize: "0.76rem" }}>
                  {s.envVars.join(", ")}
                  {s.value && (
                    <div className="text-muted" style={{ marginTop: 2 }}>{s.value}</div>
                  )}
                </td>
                <td className="text-muted" style={{ fontSize: "0.8rem" }}>{s.affects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-tertiary" style={{ fontSize: "0.74rem" }}>
        Mostra apenas se a variável existe — o valor do segredo nunca é exibido.
      </p>
    </div>
  );
}
