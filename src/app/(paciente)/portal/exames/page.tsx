import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { ExamParameterChart } from "@/components/charts/ExamParameterChart";
import { formatDateFull } from "@/lib/utils";

const FLAG_LABELS: Record<string, string> = { NORMAL: "Normal", ATENCAO: "Atenção", INDETERMINADO: "Indeterminado" };
const FLAG_BADGE: Record<string, string> = { NORMAL: "badge-primary", ATENCAO: "badge-danger", INDETERMINADO: "badge-info" };

export default async function PortalExamesPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const parameters = await dbForPatient(sessionUser.clientId).getExamResultsGrouped();
  const attention = parameters.filter((p) => p.flag === "ATENCAO");

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Meus exames</h1>
          <p className="text-muted">
            {parameters.length} parâmetro(s) acompanhado(s). A interpretação diagnóstica é sempre um ato médico —
            use as sinalizações abaixo apenas como apoio.
          </p>
        </div>
      </div>

      {attention.length > 0 && (
        <section className="section">
          <div className="card card-pad" style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid var(--danger)" }}>
            <h3 style={{ marginBottom: 8 }}>⚠️ {attention.length} parâmetro(s) fora da faixa de referência</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {attention.map((p) => (
                <span key={p.parameterName} className="badge badge-danger">
                  {p.parameterName}: {p.latest.value} {p.unit}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {parameters.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>🧪</span>
            <p>Nenhum resultado de exame registrado ainda.</p>
          </div>
        </div>
      ) : (
        <section className="section exam-params-grid">
          {parameters.map((p) => (
            <div key={p.parameterName} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.parameterName}</div>
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                    {p.latest.value} {p.unit} · {formatDateFull(p.latest.collectedAt)}
                  </div>
                </div>
                <span className={`badge ${FLAG_BADGE[p.flag] ?? "badge-info"}`}>{FLAG_LABELS[p.flag] ?? p.flag}</span>
              </div>

              {p.points.length > 1 ? (
                <ExamParameterChart
                  points={p.points.map((pt) => ({ date: pt.collectedAt, value: pt.value, flag: pt.flag }))}
                  unit={p.unit ?? ""}
                  referenceMin={p.referenceMin}
                  referenceMax={p.referenceMax}
                />
              ) : (
                <p className="text-tertiary" style={{ fontSize: "0.78rem" }}>Apenas um resultado registrado ainda.</p>
              )}

              {p.referenceText && (
                <p className="text-tertiary" style={{ fontSize: "0.72rem", whiteSpace: "pre-wrap" }}>
                  V.R.: {p.referenceText}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
