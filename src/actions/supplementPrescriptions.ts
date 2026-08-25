"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const addItemSchema = z.object({
  clientId: z.string().min(1),
  prescriptionId: z.string().min(1).optional(), // ausente = cria um rascunho novo
  supplementId: z.string().min(1).optional(),
  formulaId: z.string().min(1).optional(),
  section: z.enum(["LOJA_SUPLEMENTOS", "MANIPULADO"]),
  displayName: z.string().min(1, "Nome de exibição é obrigatório"),
  acceptedBrands: z.string().optional(),
  composition: z.string().optional(),
  route: z.string().min(1),
  posology: z.string().min(1, "Posologia é obrigatória"),
  justification: z.string().min(1, "Justificativa de uso é obrigatória"),
});

/** Cria (se necessário) o rascunho de prescrição do paciente e adiciona um item. Mantém sempre no
 * máximo um RASCUNHO por paciente por vez — reaproveita o existente em vez de criar outro. */
export async function addPrescriptionItem(input: z.infer<typeof addItemSchema>) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const parsed = addItemSchema.parse(input);

  let prescriptionId = parsed.prescriptionId;
  if (!prescriptionId) {
    const draft = await prisma.supplementPrescription.findFirst({
      where: { clientId: parsed.clientId, status: "RASCUNHO" },
    });
    if (draft) {
      prescriptionId = draft.id;
    } else {
      const lastVersion = await prisma.supplementPrescription.findFirst({
        where: { clientId: parsed.clientId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const created = await prisma.supplementPrescription.create({
        data: { clientId: parsed.clientId, createdByUserId: actor.id, version: (lastVersion?.version ?? 0) + 1 },
      });
      prescriptionId = created.id;
    }
  }

  const count = await prisma.supplementPrescriptionItem.count({ where: { prescriptionId } });
  await prisma.supplementPrescriptionItem.create({
    data: {
      prescriptionId,
      section: parsed.section,
      supplementId: parsed.supplementId ?? null,
      formulaId: parsed.formulaId ?? null,
      displayName: parsed.displayName,
      acceptedBrands: parsed.acceptedBrands || null,
      composition: parsed.composition || null,
      route: parsed.route,
      posology: parsed.posology,
      justification: parsed.justification,
      order: count,
    },
  });

  revalidatePath(`/clients/${parsed.clientId}`);
  return { prescriptionId };
}

export async function removePrescriptionItem(itemId: string, clientId: string) {
  await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  await prisma.supplementPrescriptionItem.delete({ where: { id: itemId } });
  revalidatePath(`/clients/${clientId}`);
}

export async function discontinuePrescriptionItem(itemId: string, clientId: string) {
  await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  await prisma.supplementPrescriptionItem.update({
    where: { id: itemId },
    data: { active: false, discontinuedAt: new Date() },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function reactivatePrescriptionItem(itemId: string, clientId: string) {
  await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  await prisma.supplementPrescriptionItem.update({
    where: { id: itemId },
    data: { active: true, discontinuedAt: null },
  });
  revalidatePath(`/clients/${clientId}`);
}

/** Finaliza o rascunho: exige ao menos um item, com justificativa preenchida em todos (já
 * garantido na criação do item, mas revalidado aqui por segurança). Marca a prescrição
 * FINALIZADA anterior (se houver) como SUBSTITUIDA. */
export async function finalizePrescription(prescriptionId: string, clientId: string) {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const prescription = await prisma.supplementPrescription.findUnique({
    where: { id: prescriptionId },
    include: { items: true },
  });
  if (!prescription) throw new Error("Prescrição não encontrada.");
  if (prescription.items.length === 0) throw new Error("Adicione ao menos um item antes de finalizar.");
  const missingJustification = prescription.items.some((i) => !i.justification?.trim());
  if (missingJustification) throw new Error("Todo item precisa de justificativa de uso preenchida.");

  await prisma.$transaction([
    prisma.supplementPrescription.updateMany({
      where: { clientId, status: "FINALIZADA" },
      data: { status: "SUBSTITUIDA" },
    }),
    prisma.supplementPrescription.update({
      where: { id: prescriptionId },
      data: { status: "FINALIZADA" },
    }),
  ]);

  await logAudit({ actorUserId: actor.id, action: "ATUALIZAR", entity: "SupplementPrescription", entityId: prescriptionId, clientId, metadata: { finalizada: true } });

  revalidatePath(`/clients/${clientId}`);
}
