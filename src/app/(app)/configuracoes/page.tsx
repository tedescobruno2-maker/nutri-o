import Link from "next/link";
import { connection } from "next/server";
import { getProfessionalSettings } from "@/lib/dal";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { IntegrationStatusPanel } from "@/components/settings/IntegrationStatusPanel";
import { getIntegrationStatus } from "@/lib/integrationStatus";

export default async function SettingsPage() {
  // Sem isto a página seria pré-renderizada no build e o diagnóstico mostraria as variáveis
  // de ambiente do MOMENTO DO BUILD, não as do servidor rodando (doc: "Runtime Environment
  // Variables" — ler env no servidor exige renderização dinâmica).
  await connection();

  const settings = await getProfessionalSettings();
  const integrationStatus = getIntegrationStatus();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p className="text-muted">Dados da nutricionista usados no cabeçalho e rodapé dos PDFs gerados pelo sistema.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/configuracoes/pacientes" className="btn btn-ghost btn-sm">
            👥 Acesso de pacientes
          </Link>
          <Link href="/configuracoes/conta" className="btn btn-ghost btn-sm">
            🔐 Minha conta e senha
          </Link>
        </div>
      </div>

      <SettingsForm settings={settings} />

      <section className="section">
        <IntegrationStatusPanel statuses={integrationStatus} />
      </section>
    </div>
  );
}
