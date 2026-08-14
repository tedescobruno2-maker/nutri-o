"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { NewClientButton } from "./NewClientButton";
import { moveClient } from "@/actions/clients";
import { KANBAN_STATUSES, type KanbanStatusValue } from "@/lib/utils";
import type { Client } from "@/generated/prisma/client";

type BoardState = Record<KanbanStatusValue, Client[]>;

export function KanbanBoard({ initialBoard }: { initialBoard: BoardState }) {
  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const clientIndex = useMemo(() => {
    const map = new Map<string, KanbanStatusValue>();
    for (const status of KANBAN_STATUSES) {
      for (const client of board[status]) map.set(client.id, status);
    }
    return map;
  }, [board]);

  function findContainer(id: string): KanbanStatusValue | undefined {
    if ((KANBAN_STATUSES as readonly string[]).includes(id)) return id as KanbanStatusValue;
    return clientIndex.get(id);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    const status = findContainer(id);
    if (!status) return;
    setActiveClient(board[status].find((c) => c.id === id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setBoard((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((c) => c.id === activeId);
      const overIndex = overItems.findIndex((c) => c.id === overId);

      const movedClient = { ...activeItems[activeIndex], status: overContainer };
      const newActiveItems = activeItems.filter((c) => c.id !== activeId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      const newOverItems = [
        ...overItems.slice(0, insertAt),
        movedClient,
        ...overItems.slice(insertAt),
      ];

      return { ...prev, [activeContainer]: newActiveItems, [overContainer]: newOverItems };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveClient(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;

    let finalOrderIds: string[] = [];

    setBoard((prev) => {
      const items = prev[overContainer];
      const activeIndex = items.findIndex((c) => c.id === activeId);
      const overIndex = items.findIndex((c) => c.id === overId);

      let reordered = items;
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        reordered = arrayMove(items, activeIndex, overIndex);
      }
      finalOrderIds = reordered.map((c) => c.id);
      return { ...prev, [overContainer]: reordered };
    });

    startTransition(() => {
      moveClient({ clientId: activeId, status: overContainer, orderedIdsInStatus: finalOrderIds });
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Quadro Kanban</h1>
          <p className="text-muted">Arraste os cards para atualizar a etapa de cada paciente.</p>
        </div>
        <NewClientButton />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        id="nutrikanban-board"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {KANBAN_STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} clients={board[status]} />
          ))}
        </div>
        <DragOverlay>{activeClient ? <KanbanCard client={activeClient} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
