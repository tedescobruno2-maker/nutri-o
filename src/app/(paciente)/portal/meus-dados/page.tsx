import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { DownloadMyDataButton } from "@/components/portal/DownloadMyDataButton";
import { ConsentSection } from "@/components/portal/ConsentSection";
import { SubjectRequestSection } from "@/components/portal/SubjectRequestSection";
import { calculateAge } from "@/lib/utils";

export default async function PortalMeusDadosPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const db = dbForPatient(sessionUser.clientId);
  const [client, consents, subjectRequests] = await Promise.all([db.getClient(), db.getConsents(), db.getSubjectRequests()]);
  if (!client) redirect("/login");

  const age = client.birthDate ? calculateAge(client.birthDate) : client.age;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Meus dados</h1>
      </div>

      <section className="section">
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="chart-card-header">
            <h3>Dados pessoais</h3>
          </div>
          <span className="text-muted">Nome: {client.name}</span>
          {age != null && <span className="text-muted">Idade: {age} anos</span>}
          {client.height != null && <span className="text-muted">Altura: {client.height} cm</span>}
          {client.email && <span className="text-muted">E-mail: {client.email}</span>}
          {client.phone && <span className="text-muted">Telefone: {client.phone}</span>}
          {client.goal && <span className="text-muted">Objetivo: {client.goal}</span>}
        </div>
      </section>

      <section className="section">
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="chart-card-header">
            <h3>Portabilidade dos meus dados</h3>
          </div>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Baixe uma cópia de todos os seus dados guardados neste sistema — plano alimentar, histórico de
            peso e evolução, exames, suplementação e agendamentos — em um arquivo digital (LGPD, Art. 18, V).
          </p>
          <DownloadMyDataButton />
        </div>
      </section>

      <section className="section">
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="chart-card-header">
            <h3>Meus consentimentos</h3>
          </div>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            O cuidado nutricional em si não depende de consentimento (é a base legal do prontuário). O que
            está fora do cuidado direto, você decide aqui — pode conceder ou retirar a qualquer momento.
          </p>
          <ConsentSection clientId={client.id} consents={consents} />
        </div>
      </section>

      <section className="section">
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="chart-card-header">
            <h3>Meus direitos como titular dos dados</h3>
          </div>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Correção, eliminação, acesso completo ou saber com quem seus dados foram compartilhados —
            prazo de resposta de até 15 dias.
          </p>
          <SubjectRequestSection requests={subjectRequests} />
        </div>
      </section>

      <Link href="/privacidade" className="text-tertiary" style={{ fontSize: "0.8rem" }}>
        Ver a Política de Privacidade completa →
      </Link>
    </div>
  );
}
