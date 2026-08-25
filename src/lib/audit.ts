import "server-only";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export type AuditActionValue =
  | "LOGIN"
  | "LOGIN_FALHA"
  | "LOGOUT"
  | "VISUALIZAR_PRONTUARIO"
  | "CRIAR"
  | "ATUALIZAR"
  | "EXCLUIR_LOGICO"
  | "EXPORTAR"
  | "ENVIAR_DOCUMENTO"
  | "ALTERAR_REFERENCIA_EXAME"
  | "CHAMADA_IA"
  | "ACESSO_NEGADO";

export type LogAuditInput = {
  actorUserId?: string | null;
  action: AuditActionValue;
  entity?: string;
  entityId?: string;
  clientId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Registra um evento de auditoria. Append-only por design — nenhuma função de update/delete é
 * exportada. `metadata` deve trazer só um diff resumido, nunca o dado sensível inteiro.
 * Nunca lança: uma falha ao gravar auditoria não pode derrubar a operação principal, só é logada
 * no console do servidor.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    let ip = input.ip;
    let userAgent = input.userAgent;
    if (ip === undefined || userAgent === undefined) {
      try {
        const h = await headers();
        ip = ip ?? h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;
        userAgent = userAgent ?? h.get("user-agent") ?? null;
      } catch {
        // fora de um contexto de requisição (ex.: script) — segue sem IP/user-agent
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        clientId: input.clientId,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar evento de auditoria:", err);
  }
}
