import { getKanbanBoard } from "@/lib/dal";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KANBAN_STATUSES, type KanbanStatusValue } from "@/lib/utils";
import type { Client } from "@/generated/prisma/client";

export default async function KanbanPage() {
  const boardMap = await getKanbanBoard();
  const board = Object.fromEntries(KANBAN_STATUSES.map((s) => [s, boardMap.get(s) ?? []])) as Record<
    KanbanStatusValue,
    Client[]
  >;

  return <KanbanBoard initialBoard={board} />;
}
