"use client";

import { useState, useTransition } from "react";
import { invitePatientToPortal } from "@/actions/portalInvite";

export function InvitePortalButton({ clientId, alreadyInvited }: { clientId: string; alreadyInvited: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [whatsAppLink, setWhatsAppLink] = useState<string | null>(null);

  function handleClick() {
    setFeedback(null);
    setWhatsAppLink(null);
    startTransition(async () => {
      const result = await invitePatientToPortal(clientId);
      if (!result.ok) {
        setFeedback(`Erro: ${result.error}`);
        return;
      }
      setFeedback(result.emailSent ? "Convite enviado por e-mail!" : "Convite criado (e-mail em modo de teste — veja o console do servidor).");
      setWhatsAppLink(result.whatsAppLink);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Enviando..." : alreadyInvited ? "🔗 Reenviar acesso ao portal" : "🔗 Convidar para o portal"}
      </button>
      {feedback && <span className="text-muted" style={{ fontSize: "0.76rem" }}>{feedback}</span>}
      {whatsAppLink && (
        <a href={whatsAppLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          💬 Enviar também por WhatsApp
        </a>
      )}
    </div>
  );
}
