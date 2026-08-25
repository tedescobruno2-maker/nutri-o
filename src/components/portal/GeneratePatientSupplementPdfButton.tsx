"use client";

import { useState, useTransition } from "react";
import { generateSupplementPrescriptionPdfForPatient } from "@/actions/supplementPrescriptionPdf";

export function GeneratePatientSupplementPdfButton({ prescriptionId }: { prescriptionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateSupplementPrescriptionPdfForPatient(prescriptionId);
        window.open(result.url, "_blank");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao gerar o PDF.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Gerando PDF..." : "📄 Baixar PDF"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
    </span>
  );
}
