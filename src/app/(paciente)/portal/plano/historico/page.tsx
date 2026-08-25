import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { dbForPatient } from "@/lib/dbPatient";
import { formatDateFull } from "@/lib/utils";

export default async function PortalPlanoHistoricoPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) redirect("/login");

  const plans = await dbForPatient(sessionUser.clientId).getPlanHistory();

  return (
    <div className="animate-in">
      <Link href="/portal/plano" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Voltar para o plano atual
      </Link>

      <div className="page-header">
        <h1>Planos anteriores</h1>
      </div>

      {plans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span style={{ fontSize: "2rem" }}>📝</span>
            <p>Nenhum plano anterior registrado.</p>
          </div>
        </div>
      ) : (
        <div className="card card-pad">
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {plan.title} {plan.active && <span className="badge badge-primary" style={{ marginLeft: 6 }}>Ativo</span>}
                </div>
                <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                  {formatDateFull(plan.createdAt)}
                  {plan.objective ? ` · ${plan.objective}` : ""}
                </div>
              </div>
              <Link href={`/portal/plano/historico/${plan.id}`} className="btn btn-ghost btn-sm">
                Ver plano →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
