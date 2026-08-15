"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendReturnReminderEmail } from "@/actions/reminders";
import { buildWhatsAppLink, formatDateFull, initials } from "@/lib/utils";

export function ReturnReminderRow({
  client,
}: {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    lastConsultation: Date | string;
    daysSince: number;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const overdue = client.daysSince >= 30;
  const whatsAppMessage = `Olá, ${client.name.split(" ")[0]}! Aqui é da Luana Gois Nutricionista 🌱 Já faz cerca de um mês desde nossa última consulta e é hora de agendarmos seu retorno. Podemos marcar um novo horário?`;

  function handleSendEmail() {
    startTransition(async () => {
      const result = await sendReturnReminderEmail(client.id);
      if (!result.ok) {
        setFeedback(`Erro: ${result.error}`);
      } else if (result.mode === "test") {
        setFeedback("Modo de teste: e-mail não enviado de verdade (veja o console do servidor).");
      } else {
        setFeedback("E-mail enviado!");
      }
    });
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="avatar">{initials(client.name)}</div>
        <div>
          <Link href={`/clients/${client.id}`} style={{ fontWeight: 700 }}>
            {client.name}
          </Link>
          <div className="text-muted" style={{ fontSize: "0.78rem" }}>
            Última consulta em {formatDateFull(client.lastConsultation)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className={`badge ${overdue ? "badge-warm" : "badge-info"}`}>
          {overdue ? `Atrasado · ${client.daysSince}d` : `Em breve · ${client.daysSince}d`}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleSendEmail} disabled={isPending || !client.email}>
          {isPending ? "Enviando..." : "✉️ E-mail"}
        </button>
        {client.phone ? (
          <a
            href={buildWhatsAppLink(client.phone, whatsAppMessage)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            💬 WhatsApp
          </a>
        ) : (
          <span className="text-tertiary" style={{ fontSize: "0.72rem" }}>
            Sem telefone
          </span>
        )}
      </div>

      {feedback && (
        <p className="text-muted animate-in" style={{ fontSize: "0.76rem", width: "100%" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
