"use client";

import { useTransition } from "react";
import { deleteClientSupplement } from "@/actions/supplements";

export function SupplementRow({
  id,
  name,
  instructions,
  clientId,
}: {
  id: string;
  name: string;
  instructions: string;
  clientId: string;
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
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{name}</div>
        <div className="text-muted" style={{ fontSize: "0.82rem" }}>{instructions}</div>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => startTransition(() => deleteClientSupplement(id, clientId))}
      >
        ✕
      </button>
    </div>
  );
}
