"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { saveUploadedDocument } from "@/actions/upload";
import { sendEmail } from "@/lib/email";
import { formatDateFull } from "@/lib/utils";

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

const requestExamsSchema = z.object({
  clientId: z.string().min(1),
  requestedDate: z.coerce.date(),
  examNames: z.array(z.string().min(1)).min(1, "Selecione ao menos um exame"),
  notes: z.string().optional(),
});

/**
 * Solicita vários exames de uma vez (catálogo com checkboxes + exames avulsos digitados).
 */
export async function requestExams(formData: FormData) {
  const customRaw = (formData.get("customExams") as string | null) ?? "";
  const customNames = customRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = requestExamsSchema.parse({
    clientId: formData.get("clientId"),
    requestedDate: formData.get("requestedDate"),
    examNames: [...formData.getAll("examNames"), ...customNames],
    notes: formData.get("notes") || undefined,
  });

  await prisma.exam.createMany({
    data: parsed.examNames.map((name) => ({
      clientId: parsed.clientId,
      name,
      requestedDate: parsed.requestedDate,
      notes: parsed.notes,
    })),
  });

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

/**
 * Envia por e-mail a lista de exames solicitados (status SOLICITADO) para o paciente,
 * no mesmo estilo do formulário pré-consulta.
 */
export async function sendExamsEmail(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { exams: { where: { status: "SOLICITADO" }, orderBy: { requestedDate: "desc" } } },
  });
  if (!client) throw new Error("Paciente não encontrado");
  if (!client.email) {
    return { ok: false, mode: "sent" as const, error: "Paciente não tem e-mail cadastrado." };
  }
  if (client.exams.length === 0) {
    return { ok: false, mode: "sent" as const, error: "Nenhum exame com status \"Solicitado\" para enviar." };
  }

  const items = client.exams
    .map(
      (e) =>
        `<li style="margin-bottom:6px;">${e.name}${e.notes ? ` <span style="color:#666;">— ${e.notes}</span>` : ""}</li>`
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1c1c;">
      <h2 style="color:#0d7a45;">Exames solicitados 🩺</h2>
      <p>Olá, ${client.name.split(" ")[0]}! Segue a lista de exames solicitados na sua consulta de ${formatDateFull(new Date())}:</p>
      <ul style="padding-left: 20px; margin: 20px 0;">${items}</ul>
      <p style="margin-top: 32px;">Até breve,<br/>Luana Gois — Nutricionista<br/><span style="font-size:12px;color:#666;">CRN 09100683</span></p>
    </div>
  `;

  const result = await sendEmail({
    to: client.email,
    subject: "Exames solicitados — Luana Gois Nutricionista",
    html,
  });

  return result;
}
