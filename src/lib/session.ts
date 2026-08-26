import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE, generateOpaqueToken, sha256Hex } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/enums";

const PROFESSIONAL_SESSION_HOURS = 12;
const PATIENT_SESSION_DAYS = 7;

// Cabeçalhos que o Proxy injeta na requisição depois de validar a sessão — permite que
// Server Components leiam o usuário atual sem uma segunda consulta ao banco por página.
export const SESSION_HEADERS = {
  userId: "x-nlg-user-id",
  role: "x-nlg-user-role",
  name: "x-nlg-user-name",
  clientId: "x-nlg-client-id", // preenchido só quando role === PACIENTE
  portalScope: "x-nlg-portal-scope", // idem — escopo de navegação do paciente (Client.portalAccessScope)
} as const;

export type SessionUser = {
  id: string;
  role: UserRole;
  name: string;
  clientId: string | null; // id do Client, quando o usuário logado é um PACIENTE
  portalScope: string | null; // idem — "COMPLETO" | "SOMENTE_PLANO"
};

export async function createSession(
  userId: string,
  role: UserRole,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const hours = role === "PACIENTE" ? PATIENT_SESSION_DAYS * 24 : PROFESSIONAL_SESSION_HOURS;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      ip: meta.ip ?? undefined,
      userAgent: meta.userAgent ?? undefined,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/** Usado pelo Proxy: valida o token do cookie e retorna o usuário + papel, ou null. */
export async function validateSessionToken(token: string) {
  const tokenHash = await sha256Hex(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  if (!session.user.active) return null;

  // Atualiza lastSeenAt sem bloquear a resposta (best-effort).
  prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});

  return session;
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

/**
 * Usuário atual, lido dos cabeçalhos que o Proxy já validou (sem nova consulta ao banco).
 * Cacheado por requisição — pode ser chamado várias vezes na mesma árvore de renderização.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const h = await headers();
  const id = h.get(SESSION_HEADERS.userId);
  const role = h.get(SESSION_HEADERS.role) as UserRole | null;
  const name = h.get(SESSION_HEADERS.name);
  if (!id || !role || !name) return null;
  return { id, role, name, clientId: h.get(SESSION_HEADERS.clientId), portalScope: h.get(SESSION_HEADERS.portalScope) };
});

/** Garante que o usuário atual tem um dos papéis informados; lança se não tiver (ou não estiver logado). */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) {
    throw new Error("Não autorizado.");
  }
  return user;
}
