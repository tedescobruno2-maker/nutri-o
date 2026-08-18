// Sem "server-only": este módulo roda também no Edge Runtime do middleware.
export const AUTH_COOKIE = "nlg_auth";

/** Hash simples e determinístico via Web Crypto (disponível no Edge e no Node) — o cookie guarda este
 * hash, nunca a senha em texto puro. */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifica se a senha configurada (env APP_PASSWORD) corresponde ao valor do cookie de sessão. */
export async function isValidAuthCookie(cookieValue: string | undefined): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // sem senha configurada — gate desativado (não bloqueia o próprio dono)
  if (!cookieValue) return false;
  return cookieValue === (await hashPassword(expected));
}
