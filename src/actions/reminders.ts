"use server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatDateFull } from "@/lib/utils";

/**
 * Envia um e-mail lembrando o paciente de agendar o retorno de consulta
 * (ciclo padrão de acompanhamento nutricional de ~30 dias).
 */
export async function sendReturnReminderEmail(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { consultations: { orderBy: { date: "desc" }, take: 1 } },
  });
  if (!client) throw new Error("Paciente não encontrado");
  if (!client.email) {
    return { ok: false, mode: "sent" as const, error: "Paciente não tem e-mail cadastrado." };
  }

  const lastConsultation = client.consultations[0]?.date;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1c1c;">
      <h2 style="color:#0d7a45;">Hora de agendar seu retorno! 🌱</h2>
      <p>Olá, ${client.name.split(" ")[0]}! Já faz cerca de um mês desde nossa última consulta${lastConsultation ? ` (em ${formatDateFull(lastConsultation)})` : ""}.</p>
      <p>Para continuar acompanhando sua evolução e ajustando seu plano alimentar, é importante agendarmos seu retorno.</p>
      <p>Entre em contato para marcarmos um novo horário 😊</p>
      <p style="margin-top: 32px;">Até breve,<br/>Luana Gois — Nutricionista<br/><span style="font-size:12px;color:#666;">CRN 09100683 · 27 9 98210896</span></p>
    </div>
  `;

  return sendEmail({
    to: client.email,
    subject: "Hora de agendar seu retorno — Luana Gois Nutricionista",
    html,
  });
}
