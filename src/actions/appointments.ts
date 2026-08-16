"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  type: z.enum(["CONSULTA", "RETORNO"]).default("CONSULTA"),
  notes: z.string().optional(),
});

export async function createAppointment(formData: FormData) {
  const parsed = createSchema.parse({
    clientId: formData.get("clientId"),
    scheduledAt: formData.get("scheduledAt"),
    type: formData.get("type") || "CONSULTA",
    notes: formData.get("notes") || undefined,
  });

  await prisma.appointment.create({ data: parsed });
  revalidatePath("/clients");
}

const statusValues = ["AGENDADO", "CONFIRMADO", "REALIZADO", "CANCELADO"] as const;

/**
 * Atualiza o status de um agendamento. Quando marcado como REALIZADO, também
 * registra um histórico de consulta (Consultation) automaticamente, ligando o
 * agendamento ao histórico já existente do paciente.
 */
export async function updateAppointmentStatus(id: string, status: (typeof statusValues)[number]) {
  const appointment = await prisma.appointment.update({ where: { id }, data: { status } });

  if (status === "REALIZADO") {
    const existing = await prisma.consultation.findFirst({
      where: { clientId: appointment.clientId, date: appointment.scheduledAt },
    });
    if (!existing) {
      await prisma.consultation.create({
        data: { clientId: appointment.clientId, date: appointment.scheduledAt, notes: appointment.notes },
      });
    }
    revalidatePath(`/clients/${appointment.clientId}`);
  }

  revalidatePath("/clients");
}

export async function deleteAppointment(id: string) {
  await prisma.appointment.delete({ where: { id } });
  revalidatePath("/clients");
}
