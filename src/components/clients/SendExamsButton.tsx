"use client";

import { useState, useTransition } from "react";
import { sendExamsEmail } from "@/actions/exams";

export function SendExamsButton({ clientId, hasEmail }: { clientId: string; hasEmail: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await sendExamsEmail(clientId);
      if (!result.ok) {
        setFeedback(`Erro: ${result.error}`);
      } else if (result.mode === "test") {
        setFeedback("Modo de teste: e-mail não foi enviado de verdade (veja o console do servidor).");
      } else {
        setFeedback("E-mail enviado com sucesso!");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleClick} disabled={isPending || !hasEmail}>
        {isPending ? "Enviando..." : "✉️ Enviar exames por e-mail"}
      </button>
      {feedback && (
        <p className="text-muted animate-in" style={{ fontSize: "0.76rem" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
