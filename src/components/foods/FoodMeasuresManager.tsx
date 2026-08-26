"use client";

import { useState, useTransition } from "react";
import { createFoodMeasure, updateFoodMeasure, deleteFoodMeasure } from "@/actions/foodMeasures";
import { suggestFoodMeasureGrams } from "@/actions/foodMeasureAI";

type Measure = { id: string; label: string; grams: number; source: string; isDefault: boolean };

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "digitada",
  IA_ESTIMADA: "estimativa da IA",
  TACO: "TACO",
  IBGE_POF: "IBGE/POF",
  USDA: "USDA",
  ROTULO: "rótulo",
  IMPORTADO_PENDENTE: "importada",
};

function MeasureRow({ measure }: { measure: Measure }) {
  const [editing, setEditing] = useState(false);
  const [grams, setGrams] = useState(String(measure.grams));
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
      <span style={{ flex: 1 }}>{measure.label}</span>
      {editing ? (
        <>
          <input
            className="input"
            type="number"
            step="0.1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            style={{ width: 70, padding: "2px 6px" }}
          />
          <span className="text-tertiary">g</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={isPending}
            onClick={() => startTransition(async () => { await updateFoodMeasure({ id: measure.id, grams: Number(grams) }); setEditing(false); })}
          >
            ✓
          </button>
        </>
      ) : (
        <>
          <span>{measure.grams} g</span>
          <span className="text-tertiary" style={{ fontSize: "0.7rem" }}>({SOURCE_LABELS[measure.source] ?? measure.source})</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>editar</button>
        </>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        disabled={isPending}
        onClick={() => startTransition(() => deleteFoodMeasure(measure.id))}
      >
        ✕
      </button>
    </div>
  );
}

export function FoodMeasuresManager({ foodId, measures }: { foodId: string; measures: Measure[] }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [grams, setGrams] = useState("");
  const [wasAiSuggested, setWasAiSuggested] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSuggest() {
    setError(null);
    setAiReasoning(null);
    startTransition(async () => {
      const result = await suggestFoodMeasureGrams(foodId, label);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAiReasoning(result.data.reasoning);
      if (result.data.grams != null) {
        setGrams(String(result.data.grams));
        setWasAiSuggested(true);
      } else {
        setGrams("");
        setWasAiSuggested(false);
      }
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await createFoodMeasure({ foodId, label, grams: Number(grams), wasAiSuggested, aiReasoning: aiReasoning ?? undefined });
        setAdding(false);
        setLabel("");
        setGrams("");
        setWasAiSuggested(false);
        setAiReasoning(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao salvar a medida.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
      {measures.length === 0 && !adding && (
        <span className="text-tertiary" style={{ fontSize: "0.74rem" }}>Nenhuma medida caseira cadastrada.</span>
      )}
      {measures.map((m) => (
        <MeasureRow key={m.id} measure={m} />
      ))}

      {!adding ? (
        <button type="button" className="btn btn-ghost btn-xs" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}>
          + Medida caseira
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 6, border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="input"
              placeholder="Ex: 1 colher de sopa"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setWasAiSuggested(false); }}
              style={{ flex: 1, padding: "2px 6px", fontSize: "0.78rem" }}
            />
            <button type="button" className="btn btn-ghost btn-xs" disabled={isPending || !label.trim()} onClick={handleSuggest}>
              {isPending ? "..." : "Sugerir com IA"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Gramas"
              value={grams}
              onChange={(e) => { setGrams(e.target.value); setWasAiSuggested(false); }}
              style={{ width: 90, padding: "2px 6px", fontSize: "0.78rem" }}
            />
            <span className="text-tertiary" style={{ fontSize: "0.76rem" }}>g (ou deixe em branco e cancele)</span>
          </div>
          {aiReasoning && (
            <span className="text-tertiary" style={{ fontSize: "0.72rem", fontStyle: "italic" }}>
              IA: {aiReasoning}{wasAiSuggested ? "" : " — não foi possível estimar, digite manualmente."}
            </span>
          )}
          {error && <span style={{ color: "var(--danger)", fontSize: "0.74rem" }}>{error}</span>}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn btn-primary btn-xs" disabled={isPending || !label.trim() || !grams} onClick={handleSave}>
              Salvar
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={isPending}
              onClick={() => { setAdding(false); setLabel(""); setGrams(""); setAiReasoning(null); setWasAiSuggested(false); setError(null); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
