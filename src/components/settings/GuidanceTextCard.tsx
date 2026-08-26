"use client";

import { useTransition } from "react";
import { deleteGuidanceText } from "@/actions/settings";
import { GuidanceTextModal } from "./GuidanceTextModal";
import { MealSlotBadges } from "@/components/ui/MealSlotPicker";

type GuidanceText = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string | null;
  mealSlots?: string | null;
};

export function GuidanceTextCard({ text }: { text: GuidanceText }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 8, opacity: isPending ? 0.5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <strong>{text.title}</strong>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <GuidanceTextModal text={text} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm(`Remover o texto "${text.title}"?`)) startTransition(() => deleteGuidanceText(text.id));
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <p className="text-muted" style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{text.content}</p>
      <MealSlotBadges mealSlots={text.mealSlots ?? null} />
      {text.tags && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {text.tags.split(",").map((t) => (
            <span key={t} className="badge badge-neutral">
              {t.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
