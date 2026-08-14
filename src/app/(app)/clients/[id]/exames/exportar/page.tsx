import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientForExamsExport } from "@/lib/dal";
import { PrintButton } from "@/components/planbuilder/PrintButton";
import { formatDateFull } from "@/lib/utils";

export default async function ExportExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientForExamsExport(id);
  if (!client) notFound();

  const requested = client.exams.filter((e) => e.status === "SOLICITADO");
  const withResult = client.exams.filter((e) => e.status !== "SOLICITADO");

  return (
    <div className="animate-in">
      <div className="page-header no-print">
        <Link href={`/clients/${client.id}`} className="btn btn-ghost btn-sm">
          ← Voltar para o paciente
        </Link>
        <PrintButton />
      </div>

      <div className="plan-document">
        <header className="plan-doc-header">
          <div>
            <div className="eyebrow">NutriKanban</div>
            <h1>Solicitação de Exames</h1>
            <p className="text-muted">Luana Gois — Nutricionista · CRN 09100683</p>
          </div>
          <div className="plan-doc-date text-tertiary">Gerado em {formatDateFull(new Date())}</div>
        </header>

        <section className="plan-doc-client">
          <div>
            <div className="eyebrow">Paciente</div>
            <h2>{client.name}</h2>
          </div>
        </section>

        {requested.length === 0 ? (
          <p className="text-tertiary">Nenhum exame com status &quot;Solicitado&quot; no momento.</p>
        ) : (
          <section className="plan-doc-meal">
            <h3>Exames solicitados</h3>
            <ul className="plan-doc-exam-list">
              {requested.map((e) => (
                <li key={e.id}>
                  {e.name}
                  {e.notes && <span className="text-tertiary"> — {e.notes}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {withResult.length > 0 && (
          <section className="plan-doc-meal">
            <h3>Exames com resultado recebido</h3>
            <ul className="plan-doc-exam-list">
              {withResult.map((e) => (
                <li key={e.id}>
                  {e.name}
                  <span className="text-tertiary"> — resultado em {e.resultDate ? formatDateFull(e.resultDate) : "—"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="plan-doc-footer">
          <span>📞 27 9 98210896</span>
          <span>✉️ luanagois2@hotmail.com</span>
          <span>📍 Av. José Maria Vivacqua Santos, 280, Jardim Camburi - Vitória - ES, Sala 1003</span>
        </footer>
      </div>
    </div>
  );
}
