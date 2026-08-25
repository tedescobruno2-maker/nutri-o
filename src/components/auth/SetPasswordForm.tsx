"use client";

import { useState, useTransition } from "react";
import { setPasswordWithToken } from "@/actions/auth";

export function SetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setPasswordWithToken(formData);
      if (!result.ok) setError(result.error ?? "Não foi possível definir a senha.");
      // Em caso de sucesso, a action já faz redirect() — não há mais nada a fazer aqui.
    });
  }

  return (
    <form action={handleSubmit} className="card glass card-pad" style={{ width: "min(380px, 100%)", display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="newPassword">Nova senha</label>
        <input className="input" id="newPassword" name="newPassword" type="password" required minLength={8} autoFocus />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirme a senha</label>
        <input className="input" id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Salvando..." : "Definir senha e entrar"}
      </button>
    </form>
  );
}
