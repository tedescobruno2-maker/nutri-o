"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, generateOpaqueToken } from "@/lib/auth";
import { createPasswordResetToken } from "@/actions/auth";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { calculateAge, buildWhatsAppLink } from "@/lib/utils";
import { requireRole } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type InviteResult =
  | { ok: true; whatsAppLink: string | null; emailSent: boolean }
  | { ok: false; error: string };

/**
 * Convida um paciente para o portal: cria a conta (role PACIENTE) se ainda não existir, gera um
 * link de primeiro acesso de uso único (7 dias) e envia por e-mail. Se paciente for menor de
 * idade, usa os dados do responsável legal (Res. CFN 594/2017, Art. 3º, IV) — ver 5.8.4 do plano.
 */
export async function invitePatientToPortal(clientId: string): Promise<InviteResult> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Paciente não encontrado." };

  const isMinor = client.birthDate ? calculateAge(client.birthDate) < 18 : false;
  const targetEmail = isMinor ? client.guardianEmail : client.email;
  const targetPhone = isMinor ? client.guardianPhone : client.phone;
  const targetName = isMinor ? client.guardianName ?? client.name : client.name;

  if (!targetEmail) {
    return {
      ok: false,
      error: isMinor
        ? "Cadastre o e-mail do responsável legal antes de convidar (paciente menor de idade)."
        : "Cadastre um e-mail para o paciente antes de convidar.",
    };
  }

  let user = client.userId ? await prisma.user.findUnique({ where: { id: client.userId } }) : null;

  if (!user) {
    // Senha inicial é um placeholder aleatório inutilizável — só o link de primeiro acesso
    // permite entrar, então nunca é preciso (nem possível) fazer login com ela diretamente.
    const placeholderHash = await hashPassword(generateOpaqueToken());
    user = await prisma.user.create({
      data: {
        email: targetEmail,
        passwordHash: placeholderHash,
        name: targetName,
        role: "PACIENTE",
        mustChangePassword: true,
      },
    });
    await prisma.client.update({ where: { id: clientId }, data: { userId: user.id } });
  }

  const token = await createPasswordResetToken(user.id, 7);
  const firstAccessUrl = `${APP_URL}/definir-senha/${token}`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1c1c;">
      <h2 style="color:#0d7a45;">Bem-vindo(a) ao seu portal 🌱</h2>
      <p>Olá, ${targetName.split(" ")[0]}! A Luana criou um acesso para você acompanhar${isMinor ? ` o plano de ${client.name.split(" ")[0]}` : " seu plano, exames e evolução"} pelo portal do paciente.</p>
      <p style="margin: 24px 0;">
        <a href="${firstAccessUrl}" style="background:#0d7a45; color:white; padding:12px 22px; border-radius:999px; text-decoration:none; font-weight:700;">
          Definir minha senha e entrar
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">Ou copie e cole este link no navegador: ${firstAccessUrl}</p>
      <p style="font-size: 13px; color: #666;">Este link é de uso único e expira em 7 dias.</p>
      <p style="margin-top: 32px;">Até breve,<br/>Luana Gois — Nutricionista</p>
    </div>
  `;

  const emailResult = await sendEmail({ to: targetEmail, subject: "Seu acesso ao portal — Luana Gois Nutricionista", html });

  const whatsAppLink = targetPhone
    ? buildWhatsAppLink(
        targetPhone,
        `Olá, ${targetName.split(" ")[0]}! Aqui é da Luana Gois Nutricionista 🌱 Segue o link para você criar seu acesso ao portal: ${firstAccessUrl}`
      )
    : null;

  await logAudit({
    actorUserId: actor.id,
    action: "ENVIAR_DOCUMENTO",
    entity: "User",
    entityId: user.id,
    clientId,
    metadata: { tipo: "convite_portal", isMinor },
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true, whatsAppLink, emailSent: emailResult.ok };
}
