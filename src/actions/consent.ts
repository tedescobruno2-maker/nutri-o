"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";
import type { ConsentPurpose } from "@/generated/prisma/enums";

/**
 * Consentimento granular por finalidade (Fase 11, 6.2 bloco A). Append-only: cada
 * grant/revogação cria uma LINHA NOVA — nunca UPDATE numa linha existente — para que o
 * histórico completo (Art. 18, IX) fique sempre reconstituível.
 */

const PURPOSES: ConsentPurpose[] = ["TELENUTRICAO", "USO_IA_EXAMES", "IMAGEM_DIVULGACAO", "MARKETING", "PESQUISA"];

export async function getConsentStatus(clientId: string) {
  const rows = await prisma.consent.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  return PURPOSES.map((purpose) => ({
    purpose,
    latest: rows.find((r) => r.purpose === purpose) ?? null,
  }));
}

const setConsentSchema = z.object({
  clientId: z.string().min(1),
  purpose: z.enum(["TELENUTRICAO", "USO_IA_EXAMES", "IMAGEM_DIVULGACAO", "MARKETING", "PESQUISA"]),
  granted: z.boolean(),
});

/** Só o próprio paciente (via portal) ou a nutricionista em nome dele grava — nunca um clientId
 * vindo de fora sem checagem de sessão correspondente. */
export async function setConsent(input: z.infer<typeof setConsentSchema>) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) throw new Error("Sessão inválida.");

  const parsed = setConsentSchema.parse(input);

  // Paciente só pode mexer no próprio consentimento; profissional pode mexer no de qualquer um
  // (ex.: registrar consentimento verbal dado presencialmente).
  if (sessionUser.role === "PACIENTE" && sessionUser.clientId !== parsed.clientId) {
    throw new Error("Você só pode alterar o próprio consentimento.");
  }

  // A2 (6.2 bloco A) — timestamp, versão do texto, IP e origem gravados na própria linha do
  // consentimento (não só no AuditLog em paralelo, abaixo) — é a prova de como o consentimento
  // foi dado, exigida junto com o registro em si.
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;

  await prisma.consent.create({
    data: {
      clientId: parsed.clientId,
      purpose: parsed.purpose,
      granted: parsed.granted,
      textVersion: PRIVACY_POLICY_VERSION,
      grantedAt: parsed.granted ? new Date() : null,
      revokedAt: parsed.granted ? null : new Date(),
      ip,
      userAgent,
    },
  });

  await logAudit({
    actorUserId: sessionUser.id,
    action: "ATUALIZAR",
    entity: "Consent",
    clientId: parsed.clientId,
    metadata: { finalidade: parsed.purpose, concedido: parsed.granted },
  });

  revalidatePath("/portal/meus-dados");
  revalidatePath(`/clients/${parsed.clientId}`);
}
