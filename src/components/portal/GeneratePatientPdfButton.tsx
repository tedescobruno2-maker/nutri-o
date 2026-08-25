"use client";

import { useState, useTransition } from "react";
import { generateMealPlanPdfForPatient } from "@/actions/planPdf";

export function GeneratePatientPdfButton({ mealPlanId }: { mealPlanId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateMealPlanPdfForPatient(mealPlanId, true);
        window.open(result.url, "_blank");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o PDF.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Gerando PDF..." : "📄 Baixar PDF"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
    </span>
  );
}
