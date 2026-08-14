"use client";

import { useTransition } from "react";
import { deleteClientSupplement, discontinueSupplement, reactivateSupplement } from "@/actions/supplements";
import { formatDateFull } from "@/lib/utils";

export function SupplementRow({
  id,
  name,
  instructions,
  clientId,
  active = true,
  discontinuedAt = null,
}: {
  id: string;
  name: string;
  instructions: string;
  clientId: string;
  active?: boolean;
  discontinuedAt?: Date | string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
        opacity: isPending ? 0.5 : active ? 1 : 0.6,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", textDecoration: active ? "none" : "line-through" }}>
            {name}
          </span>
          {!active && <span className="badge badge-warm">Descontinuado</span>}
        </div>
        <div className="text-muted" style={{ fontSize: "0.82rem" }}>{instructions}</div>
        {!active && discontinuedAt && (
          <div className="text-tertiary" style={{ fontSize: "0.76rem" }}>
            Descontinuado em {formatDateFull(discontinuedAt)}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {active ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => discontinueSupplement(id, clientId))}
          >
            Descontinuar
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => reactivateSupplement(id, clientId))}
          >
            Reativar
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => startTransition(() => deleteClientSupplement(id, clientId))}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
