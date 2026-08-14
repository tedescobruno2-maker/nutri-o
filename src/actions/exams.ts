"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { saveUploadedDocument } from "@/actions/upload";

const addSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Nome do exame é obrigatório"),
  requestedDate: z.coerce.date(),
  notes: z.string().optional(),
});

export async function addExam(formData: FormData) {
  const parsed = addSchema.parse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    requestedDate: formData.get("requestedDate"),
    notes: formData.get("notes") || undefined,
  });

  await prisma.exam.create({ data: parsed });
  revalidatePath(`/clients/${parsed.clientId}`);
}

const resultSchema = z.object({
  examId: z.string().min(1),
  clientId: z.string().min(1),
  resultDate: z.coerce.date(),
  notes: z.string().optional(),
});

export async function markExamResult(formData: FormData) {
  const parsed = resultSchema.parse({
    examId: formData.get("examId"),
    clientId: formData.get("clientId"),
    resultDate: formData.get("resultDate"),
    notes: formData.get("notes") || undefined,
  });

  const file = formData.get("file") as File | null;
  const fileUrl = await saveUploadedDocument(file, "exames");

  await prisma.exam.update({
    where: { id: parsed.examId },
    data: {
      status: "RESULTADO_RECEBIDO",
      resultDate: parsed.resultDate,
      notes: parsed.notes,
      fileUrl: fileUrl ?? undefined,
    },
  });

  revalidatePath(`/clients/${parsed.clientId}`);
}

export async function deleteExam(id: string, clientId: string) {
  await prisma.exam.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}
