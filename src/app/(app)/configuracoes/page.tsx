import Link from "next/link";
import { getProfessionalSettings } from "@/lib/dal";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const settings = await getProfessionalSettings();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p className="text-muted">Dados da nutricionista usados no cabeçalho e rodapé dos PDFs gerados pelo sistema.</p>
        </div>
        <Link href="/configuracoes/conta" className="btn btn-ghost btn-sm">
          🔐 Minha conta e senha
        </Link>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
