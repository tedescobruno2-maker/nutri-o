"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { login, verifyMfaAndCompleteLogin } from "@/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCredentials(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.mfaRequired) {
        setStep("mfa");
        return;
      }
      router.push(next && next !== "/" ? next : result.redirectTo);
      router.refresh();
    });
  }

  function handleMfa(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await verifyMfaAndCompleteLogin(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(next && next !== "/" ? next : result.redirectTo);
      router.refresh();
    });
  }

  if (step === "mfa") {
    return (
      <form action={handleMfa} className="card glass card-pad" style={{ width: "min(360px, 100%)", display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </p>
        <div className="field">
          <label htmlFor="code">Código</label>
          <input className="input" id="code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus />
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Verificando..." : "Confirmar"}
        </button>
      </form>
    );
  }

  return (
    <form action={handleCredentials} className="card glass card-pad" style={{ width: "min(360px, 100%)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input className="input" id="password" name="password" type="password" required />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
