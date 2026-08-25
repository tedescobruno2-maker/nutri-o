"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { dbForPatient } from "@/lib/dbPatient";
import { sendEmail } from "@/lib/email";
import { calculateAge, formatDateFull } from "@/lib/utils";

/** 5.9.1 — regra das 24h, validada aqui (nunca só escondendo o botão no cliente). */
const MIN_HOURS_NOTICE_MESSAGE = "Reagendamentos precisam de no mínimo 24 horas de antecedência. Entre em contato com a nutricionista por telefone.";

const requestSchema = z.object({
  appointmentId: z.string().min(1),
  proposedAt: z.coerce.date(),
  alternativeAt: z.coerce.date().nullable().optional(),
  reason: z.string().optional(),
});

/** Contato do paciente para notificação — usa o do responsável legal quando menor de idade
 * (mesma regra de 5.8.4 / invitePatientToPortal). */
function contactEmailFor(client: { email: string | null; birthDate: Date | null; guardianEmail: string | null }) {
  const isMinor = client.birthDate ? calculateAge(client.birthDate) < 18 : false;
  return isMinor ? client.guardianEmail : client.email;
}

/** Paciente propõe novo horário para uma consulta (5.9.2 ponto 1) — appointmentId é resolvido
 * pela sessão via dbForPatient, nunca confiado cru. */
export async function requestReschedule(input: z.infer<typeof requestSchema>) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) throw new Error("Sessão de paciente inválida.");

  const parsed = requestSchema.parse(input);
  const appointment = await dbForPatient(sessionUser.clientId).getAppointmentById(parsed.appointmentId);
  if (!appointment) throw new Error("Consulta não encontrada.");

  const hoursUntil = (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < appointment.cancellationDeadlineHours) {
    throw new Error(MIN_HOURS_NOTICE_MESSAGE);
  }

  const request = await prisma.appointmentRescheduleRequest.create({
    data: {
      appointmentId: appointment.id,
      clientId: sessionUser.clientId,
      requestedByUserId: sessionUser.id,
      proposedAt: parsed.proposedAt,
      alternativeAt: parsed.alternativeAt ?? null,
      reason: parsed.reason || null,
    },
  });

  await logAudit({
    actorUserId: sessionUser.id,
    action: "CRIAR",
    entity: "AppointmentRescheduleRequest",
    entityId: request.id,
    clientId: sessionUser.clientId,
    metadata: { appointmentId: appointment.id, proposedAt: parsed.proposedAt.toISOString() },
  });

  revalidatePath("/portal/agenda");
  revalidatePath("/");
}

const decideSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APROVADO", "RECUSADO"]),
  decisionNote: z.string().optional(),
});

/** Nutricionista aprova ou recusa (5.9.2 pontos 3-4). Aprovar move o Appointment; recusar mantém
 * o horário original. Os dois notificam o paciente por e-mail e gravam AuditLog. */
export async function decideReschedule(input: z.infer<typeof decideSchema>) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const parsed = decideSchema.parse(input);

  const request = await prisma.appointmentRescheduleRequest.findUnique({
    where: { id: parsed.requestId },
    include: { appointment: { include: { client: true } } },
  });
  if (!request) throw new Error("Solicitação não encontrada.");
  if (request.status !== "PENDENTE") throw new Error("Esta solicitação já foi decidida.");

  const client = request.appointment.client;

  if (parsed.decision === "APROVADO") {
    await prisma.$transaction([
      prisma.appointment.update({ where: { id: request.appointmentId }, data: { scheduledAt: request.proposedAt, status: "AGENDADO" } }),
      prisma.appointmentRescheduleRequest.update({
        where: { id: request.id },
        data: { status: "APROVADO", decidedByUserId: actor.id, decidedAt: new Date(), decisionNote: parsed.decisionNote || null },
      }),
    ]);
  } else {
    await prisma.appointmentRescheduleRequest.update({
      where: { id: request.id },
      data: { status: "RECUSADO", decidedByUserId: actor.id, decidedAt: new Date(), decisionNote: parsed.decisionNote || null },
    });
  }

  const to = contactEmailFor(client);
  if (to) {
    const finalDate = parsed.decision === "APROVADO" ? request.proposedAt : request.appointment.scheduledAt;
    const subject = parsed.decision === "APROVADO" ? "Seu reagendamento foi aprovado" : "Sobre sua solicitação de reagendamento";
    const html = `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1c1c;">
        <h2 style="color:#0d7a45;">${parsed.decision === "APROVADO" ? "Reagendamento aprovado ✅" : "Sobre seu pedido de reagendamento"}</h2>
        <p>Olá, ${client.name.split(" ")[0]}!</p>
        <p>${
          parsed.decision === "APROVADO"
            ? `Sua consulta foi remarcada para <strong>${formatDateFull(finalDate)}</strong>.`
            : `A Luana não pôde aprovar o horário proposto. Sua consulta continua marcada para <strong>${formatDateFull(finalDate)}</strong>.`
        }</p>
        ${parsed.decisionNote ? `<p style="color:#555;">Observação da nutricionista: ${parsed.decisionNote}</p>` : ""}
        <p style="margin-top: 24px;">Qualquer dúvida, é só chamar.</p>
        <p style="margin-top: 16px;">Até breve,<br/>Luana Gois — Nutricionista</p>
      </div>
    `;
    await sendEmail({ to, subject, html });
  }

  await logAudit({
    actorUserId: actor.id,
    action: "ATUALIZAR",
    entity: "AppointmentRescheduleRequest",
    entityId: request.id,
    clientId: request.clientId,
    metadata: { decisao: parsed.decision, nota: parsed.decisionNote ?? null, notificado: !!to },
  });

  revalidatePath("/");
  revalidatePath("/clients");
}
