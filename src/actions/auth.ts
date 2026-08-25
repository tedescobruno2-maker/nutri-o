"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  checkPasswordPolicy,
  generateOpaqueToken,
  sha256Hex,
  AUTH_COOKIE,
} from "@/lib/auth";
import { createSession, setSessionCookie, clearSessionCookie, revokeSession } from "@/lib/session";
import { verifyMfaCode } from "@/lib/mfa";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

const MFA_PENDING_COOKIE = "nlg_mfa_pending";
const MFA_PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutos
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

export type LoginResult =
  | { ok: true; mfaRequired: false; redirectTo: string }
  | { ok: true; mfaRequired: true }
  | { ok: false; error: string };

export type PostMfaLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function login(formData: FormData): Promise<LoginResult> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";
  const meta = await requestMeta();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    await logAudit({ action: "LOGIN_FALHA", metadata: { email }, ...meta });
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logAudit({ actorUserId: user.id, action: "LOGIN_FALHA", metadata: { motivo: "bloqueado" }, ...meta });
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutesLeft} min.` };
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil = failedLoginCount >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil: lockedUntil ?? undefined } });
    await logAudit({ actorUserId: user.id, action: "LOGIN_FALHA", ...meta });
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });

  if (user.mfaEnabledAt) {
    const cookieStore = await cookies();
    cookieStore.set(MFA_PENDING_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MFA_PENDING_TTL_MS / 1000,
      path: "/",
    });
    return { ok: true, mfaRequired: true };
  }

  const outcome = await completeLogin(user.id, meta);
  return outcome.ok ? { ok: true, mfaRequired: false, redirectTo: outcome.redirectTo } : outcome;
}

export async function verifyMfaAndCompleteLogin(formData: FormData): Promise<PostMfaLoginResult> {
  const code = ((formData.get("code") as string) ?? "").trim();
  const meta = await requestMeta();
  const cookieStore = await cookies();
  const pendingUserId = cookieStore.get(MFA_PENDING_COOKIE)?.value;

  if (!pendingUserId) {
    return { ok: false, error: "Sessão de login expirada. Faça login novamente." };
  }

  const user = await prisma.user.findUnique({ where: { id: pendingUserId } });
  if (!user || !user.mfaSecret) {
    return { ok: false, error: "Sessão de login expirada. Faça login novamente." };
  }

  if (!verifyMfaCode(user.mfaSecret, code, user.email)) {
    await logAudit({ actorUserId: user.id, action: "LOGIN_FALHA", metadata: { motivo: "mfa_invalido" }, ...meta });
    return { ok: false, error: "Código inválido." };
  }

  cookieStore.delete(MFA_PENDING_COOKIE);
  return completeLogin(user.id, meta);
}

async function completeLogin(userId: string, meta: { ip: string | null; userAgent: string | null }): Promise<PostMfaLoginResult> {
  const user = await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const { token, expiresAt } = await createSession(user.id, user.role, meta);
  await setSessionCookie(token, expiresAt);
  await logAudit({ actorUserId: user.id, action: "LOGIN", ...meta });

  const redirectTo = user.role === "PACIENTE" ? "/portal" : "/";
  return { ok: true, redirectTo };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const meta = await requestMeta();

  if (token) {
    const tokenHash = await sha256Hex(token);
    const session = await prisma.session.findUnique({ where: { tokenHash } });
    await revokeSession(token);
    if (session) {
      await logAudit({ actorUserId: session.userId, action: "LOGOUT", ...meta });
    }
  }

  await clearSessionCookie();
  redirect("/login");
}

// --- Troca de senha (obrigatória no primeiro acesso) --------------------------------------

export async function changeOwnPassword(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return { ok: false, error: "Sessão expirada." };

  const tokenHash = await sha256Hex(token);
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session) return { ok: false, error: "Sessão expirada." };

  const currentPassword = (formData.get("currentPassword") as string) ?? "";
  const newPassword = (formData.get("newPassword") as string) ?? "";

  const validCurrent = await verifyPassword(session.user.passwordHash, currentPassword);
  if (!validCurrent) return { ok: false, error: "Senha atual incorreta." };

  const policy = checkPasswordPolicy(newPassword);
  if (!policy.ok) return { ok: false, error: policy.reason };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash, mustChangePassword: false },
  });
  await logAudit({ actorUserId: session.userId, action: "ATUALIZAR", entity: "User", entityId: session.userId, metadata: { campo: "senha" } });

  return { ok: true };
}

// --- Definir senha via token (primeiro acesso do paciente / redefinição) ------------------

export async function setPasswordWithToken(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const rawToken = (formData.get("token") as string) ?? "";
  const newPassword = (formData.get("newPassword") as string) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "As senhas não coincidem." };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "A senha precisa ter no mínimo 8 caracteres." };
  }

  const tokenHash = await sha256Hex(rawToken);
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { ok: false, error: "Link inválido ou expirado. Peça um novo convite." };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash, mustChangePassword: false } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  const meta = await requestMeta();
  const { token, expiresAt } = await createSession(reset.user.id, reset.user.role, meta);
  await setSessionCookie(token, expiresAt);
  await logAudit({ actorUserId: reset.user.id, action: "LOGIN", metadata: { via: "primeiro_acesso" }, ...meta });

  redirect(reset.user.role === "PACIENTE" ? "/portal" : "/");
}

/** Gera um novo token de primeiro acesso / redefinição para um usuário (usado pelo convite). */
export async function createPasswordResetToken(userId: string, ttlDays = 7): Promise<string> {
  const token = generateOpaqueToken();
  const tokenHash = await sha256Hex(token);
  await prisma.passwordReset.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000) },
  });
  return token;
}
