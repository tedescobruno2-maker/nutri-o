"use client";

import { useState, useTransition } from "react";
import { generateMealPlanPdf } from "@/actions/planPdf";

export function GeneratePdfButton({ mealPlanId, withPhotos, label }: { mealPlanId: string; withPhotos: boolean; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateMealPlanPdf(mealPlanId, withPhotos);
        window.open(result.url, "_blank");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o PDF.");
      }
    });
  }

  return (
    <span className="no-print" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Gerando PDF..." : label}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
    </span>
  );
}
