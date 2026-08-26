"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { createPasswordResetToken } from "@/actions/auth";
import { sendEmail } from "@/lib/email";
import { buildWhatsAppLink, calculateAge } from "@/lib/utils";

/** Configurações → Acesso de pacientes (senha master): a nutricionista consegue reiniciar/definir
 * a senha de um paciente que esqueceu, e controlar se ele navega o portal inteiro ou só o próprio
 * plano alimentar. Complementa invitePatientToPortal (portalInvite.ts), que cobre o convite
 * inicial — aqui é gestão de uma conta que já existe. */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function setPatientPortalScope(clientId: string, scope: "COMPLETO" | "SOMENTE_PLANO") {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  await prisma.client.update({ where: { id: clientId }, data: { portalAccessScope: scope } });
  await logAudit({
    actorUserId: actor.id,
    action: "ATUALIZAR",
    entity: "Client",
    entityId: clientId,
    clientId,
    metadata: { campo: "portalAccessScope", valor: scope },
  });
  revalidatePath("/configuracoes/pacientes");
}

export type ResetLinkResult = { ok: true; whatsAppLink: string | null; emailSent: boolean } | { ok: false; error: string };

/** Reinicia o acesso: gera um novo link de uso único (2 dias) e envia por e-mail/WhatsApp — mesmo
 * mecanismo do convite inicial (PasswordReset), só que pra uma conta que já existe. A senha atual
 * continua valendo até o paciente definir uma nova pelo link (não derruba sessões já abertas). */
export async function resetPatientPasswordLink(clientId: string): Promise<ResetLinkResult> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Paciente não encontrado." };
  if (!client.userId) return { ok: false, error: "Este paciente ainda não tem acesso ao portal — use \"Convidar\" primeiro." };

  const user = await prisma.user.findUnique({ where: { id: client.userId } });
  if (!user) return { ok: false, error: "Conta do paciente não encontrada." };

  const isMinor = client.birthDate ? calculateAge(client.birthDate) < 18 : false;
  const targetEmail = isMinor ? client.guardianEmail : client.email;
  const targetPhone = isMinor ? client.guardianPhone : client.phone;
  const targetName = isMinor ? client.guardianName ?? client.name : client.name;

  if (!targetEmail) {
    return {
      ok: false,
      error: isMinor ? "Cadastre o e-mail do responsável legal para enviar o link." : "Cadastre um e-mail para o paciente para enviar o link.",
    };
  }

  const token = await createPasswordResetToken(user.id, 2);
  const resetUrl = `${APP_URL}/definir-senha/${token}`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1c1c;">
      <h2 style="color:#0d7a45;">Reinício de senha 🌱</h2>
      <p>Olá, ${targetName.split(" ")[0]}! A Luana gerou um novo link para você definir uma nova senha de acesso ao portal.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#0d7a45; color:white; padding:12px 22px; border-radius:999px; text-decoration:none; font-weight:700;">
          Definir nova senha
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">Ou copie e cole este link no navegador: ${resetUrl}</p>
      <p style="font-size: 13px; color: #666;">Este link é de uso único e expira em 2 dias.</p>
      <p style="margin-top: 32px;">Até breve,<br/>Luana Gois — Nutricionista</p>
    </div>
  `;

  const emailResult = await sendEmail({ to: targetEmail, subject: "Reinício de senha — Luana Gois Nutricionista", html });

  const whatsAppLink = targetPhone
    ? buildWhatsAppLink(targetPhone, `Olá, ${targetName.split(" ")[0]}! Aqui é da Luana Gois Nutricionista 🌱 Segue o link para você definir uma nova senha: ${resetUrl}`)
    : null;

  await logAudit({
    actorUserId: actor.id,
    action: "ENVIAR_DOCUMENTO",
    entity: "User",
    entityId: user.id,
    clientId,
    metadata: { tipo: "reset_senha_portal", isMinor },
  });

  return { ok: true, whatsAppLink, emailSent: emailResult.ok };
}

const setPasswordSchema = z.object({ newPassword: z.string().min(8, "Mínimo de 8 caracteres") });

/** Define a senha diretamente (sem esperar e-mail) — útil quando o paciente está na frente da
 * nutricionista/ao telefone. Marca mustChangePassword pra ele trocar no próximo acesso, e derruba
 * sessões abertas (ele pode ter perdido o aparelho, é justamente o motivo de estar pedindo isso). */
export async function setPatientPasswordDirectly(clientId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const parsed = setPasswordSchema.safeParse({ newPassword: formData.get("newPassword") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Paciente não encontrado." };
  if (!client.userId) return { ok: false, error: "Este paciente ainda não tem acesso ao portal — use \"Convidar\" primeiro." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: client.userId }, data: { passwordHash, mustChangePassword: true } }),
    prisma.session.updateMany({ where: { userId: client.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await logAudit({
    actorUserId: actor.id,
    action: "ATUALIZAR",
    entity: "User",
    entityId: client.userId,
    clientId,
    metadata: { campo: "senha", definidaPor: "admin" },
  });

  revalidatePath("/configuracoes/pacientes");
  return { ok: true };
}
