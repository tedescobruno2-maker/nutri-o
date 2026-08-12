"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendConsultationForm(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Cliente não encontrado");
  if (!client.email) {
    return { ok: false, mode: "sent" as const, error: "Cliente não tem e-mail cadastrado." };
  }

  let form = await prisma.consultationForm.findFirst({
    where: { clientId, status: { not: "COMPLETED" } },
    orderBy: { createdAt: "desc" },
  });
  if (!form) {
    form = await prisma.consultationForm.create({ data: { clientId } });
  }

  const link = `${APP_URL}/formulario/${form.token}`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1c1c;">
      <h2 style="color:#0d7a45;">Nosso dia da consulta está chegando 🌱</h2>
      <p>Olá, ${client.name.split(" ")[0]}! Gostaria de te conhecer um pouco mais antes da nossa consulta.</p>
      <p>Por favor, preencha o formulário abaixo até um dia antes da consulta:</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background:#0d7a45; color:white; padding:12px 22px; border-radius:999px; text-decoration:none; font-weight:700;">
          Preencher formulário
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">Ou copie e cole este link no navegador: ${link}</p>
      <p style="margin-top: 32px;">Até breve,<br/>Luana Gois — Nutricionista</p>
    </div>
  `;

  const result = await sendEmail({
    to: client.email,
    subject: "Formulário pré-consulta — Luana Gois Nutricionista",
    html,
  });

  await prisma.consultationForm.update({
    where: { id: form.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  revalidatePath(`/clients/${clientId}`);
  return result;
}

const mainGoalValues = [
  "EMAGRECIMENTO",
  "ESTETICA",
  "DESEMPENHO_ESPORTIVO",
  "REEDUCACAO_ALIMENTAR",
  "ENCAMINHADO_MEDICO",
] as const;

const submitSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1),
  document: z.string().min(1),
  profession: z.string().min(1),
  height: z.coerce.number().positive().optional(),
  birthDate: z.coerce.date(),
  mainGoal: z.enum(mainGoalValues),
  hasNutritionalFollowUp: z.enum(["SIM", "NAO"]),
  pathology: z.string().optional(),
  doesPhysicalActivity: z.enum(["SIM", "NAO"]),
  physicalActivityFrequency: z.string().optional(),
  medications: z.string().optional(),
  sleepQuality: z.string().optional(),
  gutHealth: z.string().optional(),
});

export async function submitConsultationForm(formData: FormData) {
  const parsed = submitSchema.parse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    document: formData.get("document"),
    profession: formData.get("profession"),
    height: formData.get("height") || undefined,
    birthDate: formData.get("birthDate"),
    mainGoal: formData.get("mainGoal"),
    hasNutritionalFollowUp: formData.get("hasNutritionalFollowUp"),
    pathology: formData.get("pathology") || undefined,
    doesPhysicalActivity: formData.get("doesPhysicalActivity"),
    physicalActivityFrequency: formData.get("physicalActivityFrequency") || undefined,
    medications: formData.get("medications") || undefined,
    sleepQuality: formData.get("sleepQuality") || undefined,
    gutHealth: formData.get("gutHealth") || undefined,
  });

  const form = await prisma.consultationForm.findUnique({ where: { token: parsed.token } });
  if (!form) throw new Error("Formulário não encontrado");

  await prisma.consultationForm.update({
    where: { token: parsed.token },
    data: {
      fullName: parsed.fullName,
      document: parsed.document,
      profession: parsed.profession,
      height: parsed.height,
      birthDate: parsed.birthDate,
      mainGoal: parsed.mainGoal,
      hasNutritionalFollowUp: parsed.hasNutritionalFollowUp === "SIM",
      pathology: parsed.pathology,
      doesPhysicalActivity: parsed.doesPhysicalActivity === "SIM",
      physicalActivityFrequency: parsed.physicalActivityFrequency,
      medications: parsed.medications,
      sleepQuality: parsed.sleepQuality,
      gutHealth: parsed.gutHealth,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  // Sincroniza alguns dados de volta para o cadastro do cliente, quando ainda vazios.
  await prisma.client.updateMany({
    where: { id: form.clientId, height: null },
    data: { height: parsed.height },
  });
  await prisma.client.updateMany({
    where: { id: form.clientId, document: null },
    data: { document: parsed.document },
  });
  await prisma.client.updateMany({
    where: { id: form.clientId, profession: null },
    data: { profession: parsed.profession },
  });

  revalidatePath(`/clients/${form.clientId}`);
  redirect(`/formulario/${parsed.token}`);
}
