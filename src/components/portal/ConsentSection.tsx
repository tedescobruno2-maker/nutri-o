"use client";

import { useTransition } from "react";
import { setConsent } from "@/actions/consent";
import { formatDateFull } from "@/lib/utils";
import type { ConsentPurpose } from "@/generated/prisma/enums";

const PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  TUTELA_SAUDE: "Cuidado nutricional (base legal do prontuário — não é opcional)",
  TELENUTRICAO: "Atendimento por telenutrição",
  USO_IA_EXAMES: "Uso de IA para ler meus exames",
  IMAGEM_DIVULGACAO: "Uso de fotos minhas em divulgação (antes-e-depois, redes sociais)",
  MARKETING: "Receber conteúdo de marketing/newsletter",
  PESQUISA: "Uso dos meus dados em pesquisa",
};

type GrantablePurpose = Exclude<ConsentPurpose, "TUTELA_SAUDE">;
type ConsentRow = { purpose: GrantablePurpose; latest: { granted: boolean; grantedAt: Date | null; revokedAt: Date | null } | null };

export function ConsentSection({ clientId, consents }: { clientId: string; consents: ConsentRow[] }) {
  const [isPending, startTransition] = useTransition();

  function toggle(purpose: GrantablePurpose, granted: boolean) {
    startTransition(() => setConsent({ clientId, purpose, granted }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {consents.map(({ purpose, latest }) => {
        const granted = latest?.granted ?? false;
        return (
          <div key={purpose} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ fontSize: "0.88rem" }}>{PURPOSE_LABELS[purpose]}</div>
              <div className="text-tertiary" style={{ fontSize: "0.74rem" }}>
                {granted && latest?.grantedAt ? `Consentido em ${formatDateFull(latest.grantedAt)}` : latest?.revokedAt ? `Retirado em ${formatDateFull(latest.revokedAt)}` : "Nunca consentido"}
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${granted ? "btn-primary" : "btn-ghost"}`}
              disabled={isPending}
              onClick={() => toggle(purpose, !granted)}
            >
              {granted ? "Concedido — retirar" : "Não concedido — conceder"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
