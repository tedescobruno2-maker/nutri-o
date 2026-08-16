import { redirect } from "next/navigation";

// O quadro Kanban foi unificado dentro de /clients (view=kanban), junto com as
// visualizações de Tabela, Cards e Calendário. Esta rota antiga redireciona para lá.
export default function KanbanRedirectPage() {
  redirect("/clients?view=kanban");
}
