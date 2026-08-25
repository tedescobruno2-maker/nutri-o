"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

/**
 * Fila de requisições de titular (Fase 11, 6.2 bloco E) — prazo legal de 15 dias (LGPD Art. 19).
 * O paciente abre pelo portal; a nutricionista responde. `dueAt` é gravado no momento da
 * abertura, nunca recalculado depois — é a referência do prazo real.
 */

const SLA_DAYS = 15;

const createSchema = z.object({
  type: z.enum(["ACESSO", "CORRECAO", "PORTABILIDADE", "ELIMINACAO", "REVOGACAO", "INFO_COMPARTILHAMENTO"]),
  description: z.string().optional(),
});

export async function createSubjectRequest(input: z.infer<typeof createSchema>) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) throw new Error("Sessão de paciente inválida.");

  const parsed = createSchema.parse(input);
  const dueAt = new Date(Date.now() + SLA_DAYS * 24 * 60 * 60 * 1000);

  const request = await prisma.subjectRequest.create({
    data: { clientId: sessionUser.clientId, type: parsed.type, description: parsed.description || null, dueAt },
  });

  await logAudit({
    actorUserId: sessionUser.id,
    action: "CRIAR",
    entity: "SubjectRequest",
    entityId: request.id,
    clientId: sessionUser.clientId,
    metadata: { tipo: parsed.type },
  });

  revalidatePath("/portal/meus-dados");
  revalidatePath("/");
  return request.id;
}

const respondSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["EM_ANDAMENTO", "ATENDIDA", "RECUSADA_FUNDAMENTADA"]),
  responseText: z.string().min(1, "Resposta é obrigatória"),
});

/** Recusa exige fundamentação por escrito (o texto de resposta) — não existe recusa muda,
 * nem para ELIMINACAO colidindo com a guarda de 20 anos (E5). */
export async function respondSubjectRequest(input: z.infer<typeof respondSchema>) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const parsed = respondSchema.parse(input);

  const request = await prisma.subjectRequest.update({
    where: { id: parsed.requestId },
    data: {
      status: parsed.status,
      responseText: parsed.responseText,
      handledByUserId: actor.id,
      handledAt: parsed.status === "EM_ANDAMENTO" ? null : new Date(),
    },
  });

  await logAudit({
    actorUserId: actor.id,
    action: "ATUALIZAR",
    entity: "SubjectRequest",
    entityId: request.id,
    clientId: request.clientId,
    metadata: { status: parsed.status },
  });

  revalidatePath("/");
  revalidatePath("/portal/meus-dados");
}
