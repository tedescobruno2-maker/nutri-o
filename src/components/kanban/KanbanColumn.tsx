"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn, KANBAN_ICONS, KANBAN_LABELS, type KanbanStatusValue } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import type { Client } from "@/generated/prisma/client";

export function KanbanColumn({ status, clients }: { status: KanbanStatusValue; clients: Client[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={cn("kanban-column", isOver && "is-over")}>
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span>{KANBAN_ICONS[status]}</span>
          <span>{KANBAN_LABELS[status]}</span>
        </div>
        <span className="kanban-column-count">{clients.length}</span>
      </div>

      <SortableContext items={clients.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-column-list">
          {clients.length === 0 && (
            <div className="empty-state" style={{ padding: "24px 8px" }}>
              <span>Nenhum cliente aqui</span>
            </div>
          )}
          {clients.map((client) => (
            <KanbanCard key={client.id} client={client} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
