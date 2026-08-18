"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function login(formData: FormData) {
  const password = (formData.get("password") as string | null) ?? "";
  const next = (formData.get("next") as string | null) || "/";
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    // Sem senha configurada no servidor — nada a validar, apenas segue.
    redirect(next);
  }

  if (password !== expected) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=1`);
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await hashPassword(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
    path: "/",
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}
