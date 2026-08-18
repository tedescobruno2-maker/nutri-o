import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidAuthCookie } from "@/lib/auth";

// Rotas que nunca exigem senha: tela de login, formulário pré-consulta enviado ao paciente
// (link público, o paciente não tem — e não deve precisar de — a senha da nutricionista).
const PUBLIC_PATHS = ["/login", "/formulario"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidAuthCookie(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Aplica a tudo, exceto assets estáticos internos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
