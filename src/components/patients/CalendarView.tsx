import Link from "next/link";
import { AddAppointmentModal } from "./AddAppointmentModal";
import { AppointmentRow } from "./AppointmentRow";

type AppointmentItem = {
  id: string;
  scheduledAt: Date | string;
  type: string;
  status: string;
  notes: string | null;
  client: { id: string; name: string };
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({
  year,
  month, // 0-11
  appointments,
  upcoming,
  clients,
}: {
  year: number;
  month: number;
  appointments: AppointmentItem[];
  upcoming: AppointmentItem[];
  clients: { id: string; name: string }[];
}) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = new Date(year, month, 1 - startWeekday);
  const totalCells = 42; // 6 semanas fixas

  const byDay = new Map<string, AppointmentItem[]>();
  for (const ap of appointments) {
    const key = toDateKey(new Date(ap.scheduledAt));
    const list = byDay.get(key) ?? [];
    list.push(ap);
    byDay.set(key, list);
  }

  const today = toDateKey(new Date());
  const prevMonth = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const nextMonth = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  const cells: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }

  return (
    <div className="calendar-layout">
      <div className="card card-pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Link href={`/clients?view=calendario&year=${prevMonth.y}&month=${prevMonth.m}`} className="btn btn-ghost btn-sm">
            ← Anterior
          </Link>
          <h3>
            {MONTH_LABELS[month]} {year}
          </h3>
          <Link href={`/clients?view=calendario&year=${nextMonth.y}&month=${nextMonth.m}`} className="btn btn-ghost btn-sm">
            Próximo →
          </Link>
        </div>

        <div className="calendar-grid" style={{ marginBottom: 6 }}>
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="text-tertiary" style={{ fontSize: "0.74rem", fontWeight: 700, textAlign: "center" }}>
              {w}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === month;
            const dayAppointments = byDay.get(key) ?? [];
            return (
              <div key={key} className={`calendar-day ${inMonth ? "" : "outside"} ${key === today ? "today" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>{date.getDate()}</span>
                  {inMonth && (
                    <AddAppointmentModal clients={clients} defaultDate={key} trigger="+" />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                  {dayAppointments.slice(0, 3).map((ap) => (
                    <Link
                      key={ap.id}
                      href={`/clients/${ap.client.id}`}
                      className="badge badge-primary"
                      style={{ fontSize: "0.66rem", padding: "2px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
                      title={ap.client.name}
                    >
                      {ap.client.name.split(" ")[0]}
                    </Link>
                  ))}
                  {dayAppointments.length > 3 && (
                    <span className="text-tertiary" style={{ fontSize: "0.66rem" }}>+{dayAppointments.length - 3} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "0.95rem" }}>Próximos agendamentos</h3>
          <AddAppointmentModal clients={clients} trigger="+ Novo" />
        </div>
        {upcoming.length === 0 ? (
          <p className="text-tertiary" style={{ fontSize: "0.82rem" }}>Nenhum agendamento futuro.</p>
        ) : (
          <div>
            {upcoming.map((ap) => (
              <AppointmentRow key={ap.id} appointment={ap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
