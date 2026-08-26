"use client";

import { useState, useTransition } from "react";
import { setPatientPortalScope, resetPatientPasswordLink } from "@/actions/portalAccess";
import { invitePatientToPortal } from "@/actions/portalInvite";
import { SetPatientPasswordModal } from "@/components/settings/SetPatientPasswordModal";

type PatientAccess = {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
  portalAccessScope: string;
  user: { active: boolean; mustChangePassword: boolean; lastLoginAt: Date | null } | null;
};

export function PatientAccessRow({ client }: { client: PatientAccess }) {
  const [scope, setScope] = useState(client.portalAccessScope);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [whatsAppLink, setWhatsAppLink] = useState<string | null>(null);

  function handleScopeChange(next: string) {
    setScope(next);
    startTransition(() => setPatientPortalScope(client.id, next as "COMPLETO" | "SOMENTE_PLANO"));
  }

  function handleInvite() {
    setFeedback(null);
    setWhatsAppLink(null);
    startTransition(async () => {
      const result = await invitePatientToPortal(client.id);
      if (!result.ok) {
        setFeedback(`Erro: ${result.error}`);
        return;
      }
      setFeedback(result.emailSent ? "Convite enviado por e-mail!" : "Convite criado (e-mail em modo de teste).");
      setWhatsAppLink(result.whatsAppLink);
    });
  }

  function handleResetLink() {
    setFeedback(null);
    setWhatsAppLink(null);
    startTransition(async () => {
      const result = await resetPatientPasswordLink(client.id);
      if (!result.ok) {
        setFeedback(`Erro: ${result.error}`);
        return;
      }
      setFeedback(result.emailSent ? "Link de reinício enviado por e-mail!" : "Link criado (e-mail em modo de teste).");
      setWhatsAppLink(result.whatsAppLink);
    });
  }

  const status = !client.userId
    ? "Sem acesso"
    : client.user?.mustChangePassword
      ? "Convidado (aguardando 1º acesso)"
      : "Ativo";

  return (
    <tr style={{ opacity: isPending ? 0.6 : 1 }}>
      <td>{client.name}</td>
      <td className="text-muted">{status}</td>
      <td>
        {client.userId ? (
          <select className="input" value={scope} onChange={(e) => handleScopeChange(e.target.value)} disabled={isPending} style={{ fontSize: "0.82rem", padding: "4px 8px" }}>
            <option value="COMPLETO">Portal completo</option>
            <option value="SOMENTE_PLANO">Só o plano alimentar</option>
          </select>
        ) : (
          <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>—</span>
        )}
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {!client.userId ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleInvite} disabled={isPending}>
                🔗 Convidar
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetLink} disabled={isPending}>
                  🔗 Reiniciar senha
                </button>
                <SetPatientPasswordModal clientId={client.id} patientName={client.name} trigger={<span className="btn btn-ghost btn-sm">🔑 Definir senha</span>} />
              </>
            )}
          </div>
          {feedback && <span className="text-muted" style={{ fontSize: "0.74rem" }}>{feedback}</span>}
          {whatsAppLink && (
            <a href={whatsAppLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              💬 Enviar por WhatsApp
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}
