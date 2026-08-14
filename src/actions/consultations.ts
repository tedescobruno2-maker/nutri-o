"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addSchema = z.object({
  clientId: z.string().min(1),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

export async function addConsultation(formData: FormData) {
  const parsed = addSchema.parse({
    clientId: formData.get("clientId"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });

  await prisma.consultation.create({ data: parsed });
  revalidatePath(`/clients/${parsed.clientId}`);
  revalidatePath("/clients");
}

export async function deleteConsultation(id: string, clientId: string) {
  await prisma.consultation.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}
