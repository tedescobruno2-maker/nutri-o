"use client";

import { useRef, useState, useTransition } from "react";
import { createGuidanceText, updateGuidanceText } from "@/actions/settings";
import { MealSlotPicker } from "@/components/ui/MealSlotPicker";
import { parseMealSlots } from "@/lib/planSlots";

const TYPE_LABELS: Record<string, string> = {
  ORIENTACAO_GERAL: "Orientação geral",
  HIDRATACAO: "Hidratação",
  SUPLEMENTACAO: "Suplementação",
  PRE_TREINO: "Pré-treino",
  TAREFA_INICIAL: "Tarefa inicial",
};

type GuidanceText = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string | null;
  mealSlots?: string | null;
};

export function GuidanceTextModal({ text, trigger }: { text?: GuidanceText; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [mealSlots, setMealSlots] = useState<string[]>(() => parseMealSlots(text?.mealSlots));
  const isEdit = !!text;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        formData.set("id", text.id);
        await updateGuidanceText(formData);
      } else {
        await createGuidanceText(formData);
        formRef.current?.reset();
        setMealSlots([]);
      }
      setOpen(false);
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(520px, 100%)", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>{isEdit ? "Editar texto" : "Novo texto"}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label htmlFor="gt-title">Título (rótulo curto)</label>
                <input className="input" id="gt-title" name="title" required defaultValue={text?.title} placeholder="Ex: Água em jejum" />
              </div>

              <div className="field">
                <label htmlFor="gt-type">Tipo</label>
                <select className="input" id="gt-type" name="type" defaultValue={text?.type ?? "ORIENTACAO_GERAL"}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="gt-content">Conteúdo</label>
                <textarea className="input" id="gt-content" name="content" rows={6} required defaultValue={text?.content} />
              </div>

              <div className="field">
                <label htmlFor="gt-tags">Tags (separadas por vírgula)</label>
                <input className="input" id="gt-tags" name="tags" defaultValue={text?.tags ?? ""} placeholder="corrida curta, musculação" />
              </div>

              <div className="field">
                <label>Horários (ajuda a montar o Plano Alimentar)</label>
                <MealSlotPicker selected={mealSlots} onChange={setMealSlots} name="mealSlots" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 4 }}>
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
