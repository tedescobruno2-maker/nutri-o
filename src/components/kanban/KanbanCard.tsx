"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, initials } from "@/lib/utils";
import type { Client } from "@/generated/prisma/client";

export function KanbanCard({ client, overlay = false }: { client: Client; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id,
    disabled: overlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        "kanban-card",
        isDragging && !overlay && "is-dragging",
        overlay && "kanban-card-overlay"
      )}
    >
      <div className="kanban-card-top">
        <div className="avatar">{initials(client.name)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="kanban-card-name">{client.name}</div>
          <div className="kanban-card-goal">{client.goal || "Objetivo não definido"}</div>
        </div>
      </div>
      {!overlay && (
        <Link
          href={`/clients/${client.id}`}
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: "flex-start" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Ver perfil →
        </Link>
      )}
    </div>
  );
}
