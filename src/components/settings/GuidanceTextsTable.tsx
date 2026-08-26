"use client";

import { useTransition } from "react";
import { deleteGuidanceText } from "@/actions/settings";
import { GuidanceTextModal } from "@/components/settings/GuidanceTextModal";
import { MealSlotBadges } from "@/components/ui/MealSlotPicker";

type GuidanceText = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string | null;
  mealSlots?: string | null;
};

function GuidanceTextRow({ text }: { text: GuidanceText }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr style={{ opacity: isPending ? 0.5 : 1 }}>
      <td>{text.title}</td>
      <td className="text-muted" style={{ maxWidth: 380 }}>
        {text.content.length > 120 ? `${text.content.slice(0, 120)}…` : text.content}
      </td>
      <td className="text-muted" style={{ fontSize: "0.78rem" }}>{text.tags || "—"}</td>
      <td><MealSlotBadges mealSlots={text.mealSlots ?? null} /></td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <GuidanceTextModal text={text} trigger={<span className="btn btn-ghost btn-sm">✎</span>} />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Remover o texto "${text.title}"?`)) startTransition(() => deleteGuidanceText(text.id));
          }}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

export function GuidanceTextsTable({ texts }: { texts: GuidanceText[] }) {
  return (
    <div className="card card-pad">
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Conteúdo</th>
              <th>Tags</th>
              <th>Horários</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {texts.map((t) => (
              <GuidanceTextRow key={t.id} text={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
