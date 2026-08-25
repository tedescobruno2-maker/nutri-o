"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { computeEffectiveFlag } from "@/lib/examFlags";

const setReferenceSchema = z.object({
  clientId: z.string().min(1),
  parameterId: z.string().min(1),
  refMin: z.number().nullable(),
  refMax: z.number().nullable(),
  refText: z.string().nullable(),
  reason: z.string().min(1, "Motivo é obrigatório"),
});

/** 5.7.2: ajusta a faixa de um parâmetro para um paciente específico. Nunca sobrescreve a faixa
 * impressa no laudo (ExamResult.referenceMin/Max/Text) — recalcula apenas o `effectiveFlag`
 * exibido na tela, pela precedência de src/lib/examFlags.ts. */
export async function setClientExamReference(input: z.infer<typeof setReferenceSchema>) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const parsed = setReferenceSchema.parse(input);

  const [parameter, previous] = await Promise.all([
    prisma.examParameter.findUnique({ where: { id: parsed.parameterId } }),
    prisma.clientExamReference.findUnique({
      where: { clientId_parameterId: { clientId: parsed.clientId, parameterId: parsed.parameterId } },
    }),
  ]);
  if (!parameter) throw new Error("Parâmetro não encontrado.");

  const reference = await prisma.clientExamReference.upsert({
    where: { clientId_parameterId: { clientId: parsed.clientId, parameterId: parsed.parameterId } },
    update: { refMin: parsed.refMin, refMax: parsed.refMax, refText: parsed.refText, reason: parsed.reason, setByUserId: actor.id },
    create: {
      clientId: parsed.clientId,
      parameterId: parsed.parameterId,
      refMin: parsed.refMin,
      refMax: parsed.refMax,
      refText: parsed.refText,
      reason: parsed.reason,
      setByUserId: actor.id,
    },
  });

  // Recalcula effectiveFlag de TODOS os ExamResult deste paciente e parâmetro (5.7.2 ponto 2).
  const results = await prisma.examResult.findMany({ where: { clientId: parsed.clientId, parameterId: parsed.parameterId } });
  for (const result of results) {
    const { flag, source } = computeEffectiveFlag(result.value, {
      clientRefMin: reference.refMin,
      clientRefMax: reference.refMax,
      catalogDefaultMin: parameter.defaultMin,
      catalogDefaultMax: parameter.defaultMax,
      labReferenceMin: result.referenceMin,
      labReferenceMax: result.referenceMax,
    });
    await prisma.examResult.update({ where: { id: result.id }, data: { effectiveFlag: flag, flagSource: source } });
  }

  await logAudit({
    actorUserId: actor.id,
    action: "ALTERAR_REFERENCIA_EXAME",
    entity: "ClientExamReference",
    entityId: reference.id,
    clientId: parsed.clientId,
    metadata: {
      parametro: parameter.canonicalName,
      valorAntigo: previous ? { refMin: previous.refMin, refMax: previous.refMax, refText: previous.refText } : null,
      valorNovo: { refMin: reference.refMin, refMax: reference.refMax, refText: reference.refText },
      motivo: parsed.reason,
    },
  });

  revalidatePath(`/clients/${parsed.clientId}/exames`);
}
