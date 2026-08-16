"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateAppointmentStatus, deleteAppointment } from "@/actions/appointments";

type AppointmentItem = {
  id: string;
  scheduledAt: Date | string;
  type: string;
  status: string;
  notes: string | null;
  client: { id: string; name: string };
};

const TYPE_LABELS: Record<string, string> = { CONSULTA: "Consulta", RETORNO: "Retorno" };
const STATUS_BADGE: Record<string, string> = {
  AGENDADO: "badge-info",
  CONFIRMADO: "badge-primary",
  REALIZADO: "badge-neutral",
  CANCELADO: "badge-danger",
};
const STATUS_LABELS: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  REALIZADO: "Realizado",
  CANCELADO: "Cancelado",
};

export function AppointmentRow({ appointment }: { appointment: AppointmentItem }) {
  const [isPending, startTransition] = useTransition();
  const dt = new Date(appointment.scheduledAt);
  const timeLabel = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", opacity: isPending ? 0.5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/clients/${appointment.client.id}`} style={{ fontWeight: 700, fontSize: "0.85rem" }}>
            {appointment.client.name}
          </Link>
          <div className="text-muted" style={{ fontSize: "0.76rem" }}>
            {dateLabel} às {timeLabel} · {TYPE_LABELS[appointment.type] ?? appointment.type}
          </div>
        </div>
        <span className={`badge ${STATUS_BADGE[appointment.status] ?? "badge-neutral"}`} style={{ flexShrink: 0 }}>
          {STATUS_LABELS[appointment.status] ?? appointment.status}
        </span>
      </div>
      {(appointment.status === "AGENDADO" || appointment.status === "CONFIRMADO") && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {appointment.status === "AGENDADO" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => startTransition(() => updateAppointmentStatus(appointment.id, "CONFIRMADO"))}
            >
              Confirmar
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => updateAppointmentStatus(appointment.id, "REALIZADO"))}
          >
            ✓ Realizada
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => updateAppointmentStatus(appointment.id, "CANCELADO"))}
          >
            Cancelar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => startTransition(() => deleteAppointment(appointment.id))}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
