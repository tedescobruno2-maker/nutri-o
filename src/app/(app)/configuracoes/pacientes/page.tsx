import { getClientsForPortalAccess } from "@/lib/dal";
import { PatientAccessTable } from "@/components/settings/PatientAccessTable";

export default async function PatientAccessPage() {
  const clients = await getClientsForPortalAccess();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Acesso de pacientes</h1>
          <p className="text-muted">
            Reinicie ou defina a senha de um paciente que perdeu o acesso, e controle se ele navega o portal inteiro ou só o próprio plano alimentar.
          </p>
        </div>
      </div>

      <PatientAccessTable clients={clients} />
    </div>
  );
}
