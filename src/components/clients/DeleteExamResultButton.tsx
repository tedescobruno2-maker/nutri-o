"use client";

import { useTransition } from "react";
import { deleteExamResultParameter } from "@/actions/examResults";

export function DeleteExamResultButton({ clientId, parameterName }: { clientId: string; parameterName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Remover todo o histórico de "${parameterName}"?`)) return;
    startTransition(() => deleteExamResultParameter(clientId, parameterName));
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={handleClick} disabled={isPending} style={{ alignSelf: "flex-start" }}>
      {isPending ? "Removendo..." : "✕ Remover parâmetro"}
    </button>
  );
}
