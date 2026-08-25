// Sem "server-only": este módulo roda também no Proxy (src/proxy.ts), que nesta versão do
// Next.js roda em runtime Node.js — mas ainda evitamos importar coisas client-only aqui.
import { hash, verify } from "@node-rs/argon2";
import commonPasswords from "./common-passwords.json";

export const AUTH_COOKIE = "nlg_session";

const COMMON_PASSWORDS = new Set(commonPasswords as string[]);

// --- Senha -------------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export type PasswordPolicyResult = { ok: true } | { ok: false; reason: string };

/** Política de senha para papéis profissionais (ADMIN_MASTER/NUTRICIONISTA) — 5.1.3 do plano mestre. */
export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < 10) {
    return { ok: false, reason: "A senha precisa ter no mínimo 10 caracteres." };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, reason: "Essa senha é comum demais e não é permitida. Escolha outra." };
  }
  return { ok: true };
}

// --- Token opaco (sessão e reset/primeiro acesso) -----------------------------------------

/** SHA-256 via Web Crypto — disponível tanto no Node quanto num eventual Edge Runtime. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Gera um token opaco aleatório (o valor puro só existe no cookie/link — o banco guarda o hash). */
export function generateOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
