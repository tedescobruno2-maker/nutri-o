"use client";

import { useMemo, useState } from "react";
import { GUIDANCE_TEXT_TYPE_LABELS } from "@/lib/utils";

type GuidanceTextBasic = { id: string; title: string; content: string; type: string };

/** Seleciona uma ou várias orientações já cadastradas na Biblioteca de Textos pra compor
 * "Orientações gerais" do plano — busca + filtro por categoria, igual ao banco de Alimentos.
 * O conteúdo dos textos escolhidos vira o valor do campo (uma por linha, como já era). */
export function GuidanceTextPicker({ texts, name, initialSelectedIds }: { texts: GuidanceTextBasic[]; name: string; initialSelectedIds?: string[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return texts.filter((t) => {
      if (typeFilter && t.type !== typeFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [texts, typeFilter, query]);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedTexts = selectedIds.map((id) => texts.find((t) => t.id === id)).filter((t): t is GuidanceTextBasic => !!t);
  const joined = selectedTexts.map((t) => t.content).join("\n");

  return (
    <div className="field">
      <label>Orientações gerais</label>
      <input type="hidden" name={name} value={joined} />

      {selectedTexts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {selectedTexts.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "var(--accent-primary-soft)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
              }}
            >
              <span>{t.title}</span>
              <button type="button" className="btn btn-ghost btn-icon" style={{ width: 22, height: 22, flexShrink: 0 }} onClick={() => toggle(t.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          type="search"
          placeholder="Buscar orientação..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Todas as categorias</option>
          {Object.entries(GUIDANCE_TEXT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
        {filtered.length === 0 ? (
          <p className="text-tertiary" style={{ fontSize: "0.8rem", padding: 10 }}>Nenhuma orientação encontrada.</p>
        ) : (
          filtered.map((t) => (
            <label
              key={t.id}
              style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
            >
              <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggle(t.id)} style={{ marginTop: 3 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{t.title}</div>
                <div className="text-tertiary" style={{ fontSize: "0.76rem" }}>
                  {t.content.length > 90 ? `${t.content.slice(0, 90)}…` : t.content}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
