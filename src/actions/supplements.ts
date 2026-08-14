"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addClientSupplementSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Nome é obrigatório"),
  instructions: z.string().min(1, "Instruções são obrigatórias"),
});

export async function addClientSupplement(formData: FormData) {
  const parsed = addClientSupplementSchema.parse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    instructions: formData.get("instructions"),
  });

  // Mantém uma referência reutilizável na biblioteca de suplementos (upsert por nome).
  const supplement = await prisma.supplement.upsert({
    where: { name: parsed.name },
    update: {},
    create: { name: parsed.name },
  });

  const count = await prisma.clientSupplement.count({ where: { clientId: parsed.clientId } });

  await prisma.clientSupplement.create({
    data: {
      clientId: parsed.clientId,
      supplementId: supplement.id,
      name: parsed.name,
      instructions: parsed.instructions,
      order: count,
    },
  });

  revalidatePath(`/clients/${parsed.clientId}`);
}

export async function deleteClientSupplement(id: string, clientId: string) {
  await prisma.clientSupplement.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}

export async function discontinueSupplement(id: string, clientId: string) {
  await prisma.clientSupplement.update({
    where: { id },
    data: { active: false, discontinuedAt: new Date() },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function reactivateSupplement(id: string, clientId: string) {
  await prisma.clientSupplement.update({
    where: { id },
    data: { active: true, discontinuedAt: null },
  });
  revalidatePath(`/clients/${clientId}`);
}
