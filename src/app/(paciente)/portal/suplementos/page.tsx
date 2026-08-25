import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { GeneratePatientSupplementPdfButton } from "@/components/portal/GeneratePatientSupplementPdfButton";
import { formatDateFull } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = { LOJA_SUPLEMENTOS: "Loja de suplementos", MANIPULADO: "Para manipular", AMBOS: "Loja de suplementos" };

export default async function PortalSuplementosPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const prescriptions = await dbForPatient(sessionUser.clientId).getPrescriptions();
  const [current, ...history] = prescriptions;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Minha suplementação</h1>
      </div>

      {!current ? (
        <div className="card">
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>💊</span>
            <p>Nenhuma prescrição de suplementos registrada ainda.</p>
          </div>
        </div>
      ) : (
        <section className="section">
          <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="chart-card-header">
              <h3>Prescrição atual</h3>
              <GeneratePatientSupplementPdfButton prescriptionId={current.id} />
            </div>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>{formatDateFull(current.date)}</span>

            {(["LOJA_SUPLEMENTOS", "MANIPULADO"] as const).map((section) => {
              const items = current.items.filter((i) => (section === "LOJA_SUPLEMENTOS" ? i.section !== "MANIPULADO" : i.section === "MANIPULADO"));
              if (items.length === 0) return null;
              return (
                <div key={section} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="text-tertiary" style={{ fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase" }}>{SECTION_LABELS[section]}</span>
                  {items.map((item) => (
                    <div key={item.id} style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                      <strong style={{ fontSize: "0.9rem" }}>{item.displayName}</strong>
                      <div className="text-muted" style={{ fontSize: "0.8rem" }}>Via {item.route.toLowerCase()}. {item.posology}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="section">
          <div className="card card-pad">
            <div className="chart-card-header">
              <h3>Histórico</h3>
            </div>
            {history.map((rx) => (
              <div key={rx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>{formatDateFull(rx.date)} · v{rx.version}</span>
                <GeneratePatientSupplementPdfButton prescriptionId={rx.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
