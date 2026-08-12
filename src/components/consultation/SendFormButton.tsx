"use client";

import { useState, useTransition } from "react";
import { sendConsultationForm } from "@/actions/consultationForm";

export function SendFormButton({ clientId, hasEmail }: { clientId: string; hasEmail: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await sendConsultationForm(clientId);
      if (!result.ok) {
        setFeedback(`Erro: ${result.error}`);
      } else if (result.mode === "test") {
        setFeedback("Modo de teste: e-mail não foi enviado de verdade (veja o console do servidor). Configure RESEND_API_KEY para enviar de verdade.");
      } else {
        setFeedback("E-mail enviado com sucesso!");
      }
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleClick} disabled={isPending || !hasEmail}>
        {isPending ? "Enviando..." : "Enviar formulário por e-mail"}
      </button>
      {!hasEmail && <p className="text-tertiary" style={{ fontSize: "0.76rem", marginTop: 6 }}>Cadastre um e-mail para o cliente primeiro.</p>}
      {feedback && (
        <p className="text-muted animate-in" style={{ fontSize: "0.8rem", marginTop: 8 }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
