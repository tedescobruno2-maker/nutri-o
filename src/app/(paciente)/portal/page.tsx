import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";

export default async function PortalHomePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const client = await dbForPatient(sessionUser.clientId).getClient();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Olá, {client?.name.split(" ")[0] ?? sessionUser.name}! 👋</h1>
          <p className="text-muted">Bem-vindo(a) ao seu portal.</p>
        </div>
      </div>

      <div className="card card-pad">
        <p className="text-muted">
          Esta é a primeira versão do seu portal. Em breve você vai poder ver aqui seu plano
          alimentar, exames, evolução de peso e agendamentos.
        </p>
      </div>
    </div>
  );
}
