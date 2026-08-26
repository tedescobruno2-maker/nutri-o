"use client";

import Link from "next/link";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import { PlanHistoryTable } from "@/components/clients/PlanHistoryTable";
import { formatDateFull } from "@/lib/utils";

type PlanHistoryItem = {
  id: string;
  title: string;
  objective: string | null;
  active: boolean;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  _count: { meals: number };
};

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
  SUBSTITUIDO: "Substituído",
};

export function PlanHistoryView({ plans }: { plans: PlanHistoryItem[] }) {
  const [mode, setMode] = useViewMode("view-mode:plan-history");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "table" ? (
        <PlanHistoryTable plans={plans} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{ padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.88rem" }}>{plan.title}</strong>
                {plan.active && <span className="badge badge-neutral" style={{ fontSize: "0.66rem" }}>Atual</span>}
                {!plan.sentAt && <span className="badge badge-warm" style={{ fontSize: "0.66rem" }}>🔒 Rascunho</span>}
              </div>
              <p className="text-tertiary" style={{ fontSize: "0.76rem", marginTop: 2 }}>
                {formatDateFull(plan.createdAt)} · {plan._count.meals} refeição(ões)
              </p>
              {plan.objective && <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>{plan.objective}</p>}
              <span className="badge badge-neutral" style={{ fontSize: "0.66rem", marginTop: 8, display: "inline-block" }}>
                {STATUS_LABELS[plan.status] ?? plan.status}
              </span>
              <div style={{ display: "flex", gap: 4, marginTop: 8, borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                <Link href={`/planos/${plan.id}`} className="btn btn-ghost btn-sm">✎ Editar</Link>
                <Link href={`/planos/${plan.id}/exportar`} className="btn btn-ghost btn-sm">Ver / PDF →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
