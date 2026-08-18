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
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
