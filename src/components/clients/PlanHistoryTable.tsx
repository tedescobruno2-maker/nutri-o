import Link from "next/link";
import { formatDateFull } from "@/lib/utils";

type PlanHistoryItem = {
  id: string;
  title: string;
  objective: string | null;
  active: boolean;
  status: string;
  createdAt: Date;
  _count: { meals: number };
};

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
  SUBSTITUIDO: "Substituído",
};

export function PlanHistoryTable({ plans }: { plans: PlanHistoryItem[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Data</th>
            <th>Refeições</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>
                {plan.title}
                {plan.active && <span className="badge badge-neutral" style={{ marginLeft: 8 }}>Atual</span>}
              </td>
              <td className="text-muted">{formatDateFull(plan.createdAt)}</td>
              <td className="text-muted">{plan._count.meals}</td>
              <td className="text-muted">{STATUS_LABELS[plan.status] ?? plan.status}</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <Link href={`/planos/${plan.id}`} className="btn btn-ghost btn-sm">✎ Editar</Link>
                <Link href={`/planos/${plan.id}/exportar`} className="btn btn-ghost btn-sm">Ver / PDF →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
