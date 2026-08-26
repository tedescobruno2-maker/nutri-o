"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClientBasic = { id: string; name: string; goal: string | null; status: string };

/** Busca dinâmica de paciente pra montar/continuar um plano em /planos (Fase 4) — substitui o
 * <select> estático que existia antes dentro do PlanBuilder. */
export function ClientPicker({ clients, selected }: { clients: ClientBasic[]; selected: ClientBasic | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [clients, query]);

  function select(id: string) {
    setQuery("");
    setFocused(false);
    router.push(`/planos?clientId=${id}`);
  }

  return (
    <div className="card card-pad" style={{ position: "relative" }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="plan-client-search">Paciente</label>
        <input
          className="input"
          id="plan-client-search"
          type="search"
          autoComplete="off"
          placeholder="Buscar paciente por nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {selected && !query && (
          <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 6 }}>
            Selecionado: <strong>{selected.name}</strong>
          </p>
        )}
      </div>
      {focused && query.trim() && (
        <div
          className="card glass animate-in"
          style={{ position: "absolute", zIndex: 20, left: 20, right: 20, marginTop: 4, maxHeight: 260, overflowY: "auto", padding: 6 }}
        >
          {filtered.length === 0 ? (
            <p className="text-tertiary" style={{ fontSize: "0.82rem", padding: 8 }}>Nenhum paciente encontrado.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => select(c.id)}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
