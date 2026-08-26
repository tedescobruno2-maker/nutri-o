"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { generateMfaSecret, getMfaQrCodeDataUrl, verifyMfaCode } from "@/lib/mfa";
import { verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  crn: z.string().optional(),
  crnRegion: z.string().optional(),
  phone: z.string().optional(),
});

export async function updateOwnProfile(formData: FormData) {
  const user = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const parsed = updateProfileSchema.parse({
    name: formData.get("name"),
    crn: formData.get("crn") || undefined,
    crnRegion: formData.get("crnRegion") || undefined,
    phone: formData.get("phone") || undefined,
  });

  await prisma.user.update({ where: { id: user.id }, data: parsed });
  await logAudit({ actorUserId: user.id, action: "ATUALIZAR", entity: "User", entityId: user.id, metadata: { campos: Object.keys(parsed) } });

  revalidatePath("/configuracoes/conta");
}

export type BeginMfaResult = { secret: string; qrDataUrl: string };

export async function beginMfaSetup(): Promise<BeginMfaResult> {
  const user = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const secret = generateMfaSecret();
  const qrDataUrl = await getMfaQrCodeDataUrl(secret, user.name);
  return { secret, qrDataUrl };
}

export async function confirmMfaSetup(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const secret = (formData.get("secret") as string) ?? "";
  const code = (formData.get("code") as string) ?? "";

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!verifyMfaCode(secret, code, fullUser.email)) {
    return { ok: false, error: "Código inválido. Confira o horário do celular e tente novamente." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabledAt: new Date(), mfaEverConfiguredAt: new Date() },
  });
  await logAudit({ actorUserId: user.id, action: "ATUALIZAR", entity: "User", entityId: user.id, metadata: { campo: "mfa_ativado" } });

  revalidatePath("/configuracoes/conta");
  return { ok: true };
}

/** Só é possível chamar depois de já ter configurado o MFA uma vez (mfaEverConfiguredAt) — a
 * exigência inicial (proxy.ts) continua valendo pra quem nunca ativou. Pede a senha atual de novo
 * como confirmação, mesmo padrão de changeOwnPassword, já que desativar 2FA é sensível. */
export async function disableMfa(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");
  const currentPassword = (formData.get("currentPassword") as string) ?? "";

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const validPassword = await verifyPassword(fullUser.passwordHash, currentPassword);
  if (!validPassword) return { ok: false, error: "Senha atual incorreta." };

  await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: null, mfaEnabledAt: null } });
  await logAudit({ actorUserId: user.id, action: "ATUALIZAR", entity: "User", entityId: user.id, metadata: { campo: "mfa_desativado" } });

  revalidatePath("/configuracoes/conta");
  return { ok: true };
}
