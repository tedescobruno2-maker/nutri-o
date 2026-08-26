"use client";

import { useEffect, useState } from "react";

export type ViewMode = "cards" | "table";

/** Preferência de visualização por página, lembrada localmente (não é dado clínico, não precisa ir ao banco). */
export function useViewMode(storageKey: string, defaultMode: ViewMode = "cards") {
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "cards" || saved === "table") setMode(saved);
    } catch {
      // localStorage indisponível (ex: navegador privado) — mantém o padrão.
    }
  }, [storageKey]);

  function update(next: ViewMode) {
    setMode(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // segue só em memória para esta sessão.
    }
  }

  return [mode, update] as const;
}

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="view-toggle" role="group" aria-label="Alternar visualização">
      <button
        type="button"
        className={`view-toggle-btn ${mode === "cards" ? "active" : ""}`}
        aria-pressed={mode === "cards"}
        onClick={() => onChange("cards")}
      >
        ▦ Cards
      </button>
      <button
        type="button"
        className={`view-toggle-btn ${mode === "table" ? "active" : ""}`}
        aria-pressed={mode === "table"}
        onClick={() => onChange("table")}
      >
        ☰ Tabela
      </button>
    </div>
  );
}
