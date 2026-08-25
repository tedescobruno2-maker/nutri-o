import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { validateSessionToken, SESSION_HEADERS } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Rotas que nunca exigem sessão: login, definição de senha por token (primeiro acesso /
// redefinição), o formulário pré-consulta enviado ao paciente (link público, sem senha), e a
// política de privacidade (Fase 11, 6.2 A4/F2 — precisa ser acessível sem login).
const PUBLIC_PATHS = ["/login", "/definir-senha", "/formulario", "/privacidade"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function forbidden() {
  return new NextResponse(
    "<!doctype html><html><body style=\"font-family:sans-serif;padding:40px;text-align:center;\"><h1>403 — Acesso negado</h1><p>Você não tem permissão para acessar esta página.</p></body></html>",
    { status: 403, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // Nunca confie em cabeçalhos x-nlg-* vindos do cliente — mesmo que nada os leia hoje em
    // rota pública, remove aqui para que um novo código nunca possa ser enganado por injeção.
    const requestHeaders = new Headers(request.headers);
    for (const header of Object.values(SESSION_HEADERS)) requestHeaders.delete(header);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await validateSessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { user } = session;
  const isPatientRoute = pathname === "/portal" || pathname.startsWith("/portal/");
  const isPatientRole = user.role === "PACIENTE";

  // Regra 1 (5.1.1): papel na rota. Qualquer cruzamento é 403 + auditoria.
  if (isPatientRole && !isPatientRoute) {
    await logAudit({
      actorUserId: user.id,
      action: "ACESSO_NEGADO",
      metadata: { pathname, motivo: "paciente_fora_do_portal" },
    });
    return forbidden();
  }
  if (!isPatientRole && isPatientRoute) {
    await logAudit({
      actorUserId: user.id,
      action: "ACESSO_NEGADO",
      metadata: { pathname, motivo: "profissional_no_portal" },
    });
    return forbidden();
  }

  // Onboarding obrigatório do papel profissional: troca de senha e, para ADMIN_MASTER, MFA.
  // /configuracoes/conta é onde os dois acontecem — libera só essa rota até resolver.
  const isAccountPage = pathname === "/configuracoes/conta" || pathname.startsWith("/configuracoes/conta/");
  if (!isPatientRole && !isAccountPage) {
    const needsPasswordChange = user.mustChangePassword;
    const needsMfaSetup = user.role === "ADMIN_MASTER" && !user.mfaEnabledAt;
    if (needsPasswordChange || needsMfaSetup) {
      return NextResponse.redirect(new URL("/configuracoes/conta", request.url));
    }
  }

  const clientId = isPatientRole ? await getPatientClientId(user.id) : null;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_HEADERS.userId, user.id);
  requestHeaders.set(SESSION_HEADERS.role, user.role);
  requestHeaders.set(SESSION_HEADERS.name, user.name);
  if (clientId) requestHeaders.set(SESSION_HEADERS.clientId, clientId);
  else requestHeaders.delete(SESSION_HEADERS.clientId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Import local (não no topo) para manter este arquivo fácil de ler de cima a baixo — só
// resolve o clientId do paciente logado quando o papel realmente é PACIENTE.
async function getPatientClientId(userId: string): Promise<string | null> {
  const { prisma } = await import("@/lib/db");
  const client = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
  return client?.id ?? null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
