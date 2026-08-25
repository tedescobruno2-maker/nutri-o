"use client";

import { useMemo, useState, useTransition } from "react";
import { setMealPlanConsultation, setMealPlanInitialGuidance } from "@/actions/mealPlans";
import { formatDate } from "@/lib/utils";
import type { Consultation, Measurement, GuidanceText } from "@/generated/prisma/client";

/** Medição de peso mais próxima da data da consulta — nunca inventa peso (5.4.5). */
function nearestMeasurement(measurements: Measurement[], date: Date): Measurement | null {
  if (measurements.length === 0) return null;
  return measurements.reduce((closest, m) => {
    const diff = Math.abs(m.date.getTime() - date.getTime());
    const closestDiff = Math.abs(closest.date.getTime() - date.getTime());
    return diff < closestDiff ? m : closest;
  }, measurements[0]);
}

export function MealPlanReferenceSection({
  mealPlanId,
  clientId,
  consultations,
  measurements,
  guidanceTexts,
  consultationId,
  initialGuidanceId,
}: {
  mealPlanId: string;
  clientId: string;
  consultations: Consultation[];
  measurements: Measurement[];
  guidanceTexts: GuidanceText[];
  consultationId: string | null;
  initialGuidanceId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedConsultation, setSelectedConsultation] = useState(consultationId ?? "");
  const [selectedGuidance, setSelectedGuidance] = useState(initialGuidanceId ?? "");

  const consultation = consultations.find((c) => c.id === selectedConsultation) ?? null;
  const weight = useMemo(() => {
    if (!consultation) return null;
    return nearestMeasurement(measurements, consultation.date);
  }, [consultation, measurements]);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div className="field" style={{ minWidth: 200 }}>
        <label>Consulta de referência</label>
        <select
          className="input"
          value={selectedConsultation}
          disabled={isPending}
          onChange={(e) => {
            setSelectedConsultation(e.target.value);
            startTransition(() => setMealPlanConsultation(mealPlanId, clientId, e.target.value || null));
          }}
        >
          <option value="">Nenhuma selecionada</option>
          {consultations.map((c) => (
            <option key={c.id} value={c.id}>{formatDate(c.date)}</option>
          ))}
        </select>
        {consultation && (
          <p className="text-tertiary" style={{ fontSize: "0.76rem", marginTop: 4 }}>
            {weight ? `Peso mais próximo: ${weight.weight} kg (${formatDate(weight.date)})` : "Sem medição registrada perto dessa data — informe o peso manualmente no cabeçalho do PDF."}
          </p>
        )}
      </div>

      <div className="field" style={{ minWidth: 240, flex: 1 }}>
        <label>Orientação inicial (Biblioteca de Textos)</label>
        <select
          className="input"
          value={selectedGuidance}
          disabled={isPending}
          onChange={(e) => {
            setSelectedGuidance(e.target.value);
            startTransition(() => setMealPlanInitialGuidance(mealPlanId, clientId, e.target.value || null));
          }}
        >
          <option value="">Nenhuma</option>
          {guidanceTexts.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
