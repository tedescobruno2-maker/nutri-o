"use client";

import { GuidanceTextCard } from "@/components/settings/GuidanceTextCard";
import { GuidanceTextsTable } from "@/components/settings/GuidanceTextsTable";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";

type GuidanceText = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  ORIENTACAO_GERAL: "Orientação geral",
  HIDRATACAO: "Hidratação",
  SUPLEMENTACAO: "Suplementação",
  PRE_TREINO: "Pré-treino",
  TAREFA_INICIAL: "Tarefa inicial",
};

export function GuidanceTextsView({ texts }: { texts: GuidanceText[] }) {
  const [mode, setMode] = useViewMode("view-mode:textos");

  const byType = new Map<string, GuidanceText[]>();
  for (const t of texts) {
    const list = byType.get(t.type) ?? [];
    list.push(t);
    byType.set(t.type, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {Object.keys(TYPE_LABELS).map((type) => {
        const list = byType.get(type);
        if (!list || list.length === 0) return null;
        return (
          <section key={type} className="section">
            <h2 style={{ marginBottom: 12, fontSize: "1rem" }}>{TYPE_LABELS[type]}</h2>
            {mode === "table" ? (
              <GuidanceTextsTable texts={list} />
            ) : (
              <div className="patient-cards-grid">
                {list.map((t) => (
                  <GuidanceTextCard key={t.id} text={t} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
