"use client";

import { useMemo, useState } from "react";
import { GuidanceTextCard } from "@/components/settings/GuidanceTextCard";
import { GuidanceTextsTable } from "@/components/settings/GuidanceTextsTable";
import { ViewToggle, useViewMode } from "@/components/ui/ViewToggle";
import { PLAN_SLOTS, PLAN_SLOT_SHORT } from "@/lib/planSlots";
import { GUIDANCE_TEXT_TYPE_LABELS as TYPE_LABELS } from "@/lib/utils";

type GuidanceText = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string | null;
  mealSlots?: string | null;
};

export function GuidanceTextsView({ texts }: { texts: GuidanceText[] }) {
  const [mode, setMode] = useViewMode("view-mode:textos");
  const [slotFilter, setSlotFilter] = useState<string | null>(null);

  const filteredTexts = useMemo(() => {
    if (!slotFilter) return texts;
    return texts.filter((t) => (t.mealSlots ?? "").split(",").map((s) => s.trim()).includes(slotFilter));
  }, [texts, slotFilter]);

  const byType = new Map<string, GuidanceText[]>();
  for (const t of filteredTexts) {
    const list = byType.get(t.type) ?? [];
    list.push(t);
    byType.set(t.type, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PLAN_SLOTS.map((slot) => {
            const active = slotFilter === slot;
            return (
              <button
                key={slot}
                type="button"
                className={active ? "plan-slot-chip plan-slot-chip-active" : "plan-slot-chip"}
                onClick={() => setSlotFilter(active ? null : slot)}
              >
                {PLAN_SLOT_SHORT[slot]}
              </button>
            );
          })}
        </div>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {filteredTexts.length === 0 && (
        <div className="card empty-state">
          <span style={{ fontSize: "2rem" }}>📚</span>
          <p>Nenhum texto marcado para esse horário ainda.</p>
        </div>
      )}

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
