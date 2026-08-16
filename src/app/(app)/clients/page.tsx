import { getClients, getKanbanBoard, getAppointmentsForMonth, getUpcomingAppointments, getClientsBasic } from "@/lib/dal";
import { NewClientButton } from "@/components/kanban/NewClientButton";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ViewSwitcher } from "@/components/patients/ViewSwitcher";
import { TableView } from "@/components/patients/TableView";
import { CardsView } from "@/components/patients/CardsView";
import { CalendarView } from "@/components/patients/CalendarView";
import { KANBAN_STATUSES, type KanbanStatusValue } from "@/lib/utils";
import type { Client } from "@/generated/prisma/client";

type ViewValue = "tabela" | "cards" | "kanban" | "calendario";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; year?: string; month?: string }>;
}) {
  const { q, view: rawView, year: rawYear, month: rawMonth } = await searchParams;
  const view: ViewValue = (["tabela", "cards", "kanban", "calendario"] as const).includes(rawView as ViewValue)
    ? (rawView as ViewValue)
    : "tabela";

  const now = new Date();
  const year = rawYear ? parseInt(rawYear, 10) : now.getFullYear();
  const month = rawMonth ? parseInt(rawMonth, 10) : now.getMonth();

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Banco de Pacientes</h1>
          <p className="text-muted">Gerencie seus pacientes em tabela, cards, kanban ou calendário.</p>
        </div>
        <NewClientButton />
      </div>

      <ViewSwitcher current={view} q={q} />

      {view === "tabela" && <TableViewContainer q={q} view={view} />}
      {view === "cards" && <CardsViewContainer q={q} view={view} />}
      {view === "kanban" && <KanbanViewContainer />}
      {view === "calendario" && <CalendarViewContainer year={year} month={month} />}
    </div>
  );
}

async function TableViewContainer({ q, view }: { q?: string; view: ViewValue }) {
  const allClients = await getClients();
  const clients = q ? allClients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : allClients;
  return (
    <>
      <SearchForm q={q} view={view} />
      <p className="text-muted" style={{ marginBottom: 12 }}>
        {allClients.length} paciente(s) cadastrado(s){q ? ` · ${clients.length} encontrado(s)` : ""}.
      </p>
      <TableView clients={clients} />
    </>
  );
}

async function CardsViewContainer({ q, view }: { q?: string; view: ViewValue }) {
  const allClients = await getClients();
  const clients = q ? allClients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : allClients;
  return (
    <>
      <SearchForm q={q} view={view} />
      <p className="text-muted" style={{ marginBottom: 12 }}>
        {allClients.length} paciente(s) cadastrado(s){q ? ` · ${clients.length} encontrado(s)` : ""}.
      </p>
      <CardsView clients={clients} />
    </>
  );
}

async function KanbanViewContainer() {
  const boardMap = await getKanbanBoard();
  const board = Object.fromEntries(KANBAN_STATUSES.map((s) => [s, boardMap.get(s) ?? []])) as Record<
    KanbanStatusValue,
    Client[]
  >;
  return <KanbanBoard initialBoard={board} />;
}

async function CalendarViewContainer({ year, month }: { year: number; month: number }) {
  const [appointments, upcoming, clients] = await Promise.all([
    getAppointmentsForMonth(year, month),
    getUpcomingAppointments(15),
    getClientsBasic(),
  ]);
  return <CalendarView year={year} month={month} appointments={appointments} upcoming={upcoming} clients={clients} />;
}

function SearchForm({ q, view }: { q?: string; view: ViewValue }) {
  return (
    <form method="GET" style={{ marginBottom: 20, maxWidth: 360, display: "flex", gap: 8 }}>
      <input type="hidden" name="view" value={view} />
      <input className="input" type="search" name="q" placeholder="Buscar por nome..." defaultValue={q ?? ""} />
    </form>
  );
}
