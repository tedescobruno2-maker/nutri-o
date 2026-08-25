"use client";

import { useState, useTransition } from "react";
import { exportMyData } from "@/actions/portalDataExport";

export function DownloadMyDataButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await exportMyData();
        window.open(result.url, "_blank");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar seus dados.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Preparando..." : "⬇️ Baixar meus dados"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
    </span>
  );
}
