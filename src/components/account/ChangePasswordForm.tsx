"use client";

import { useRef, useState, useTransition } from "react";
import { changeOwnPassword } from "@/actions/auth";

export function ChangePasswordForm({ required }: { required?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await changeOwnPassword(formData);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível trocar a senha.");
        return;
      }
      setSuccess(true);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      {required && (
        <p style={{ fontSize: "0.85rem", color: "var(--danger)" }}>
          É o seu primeiro acesso — troque a senha temporária antes de continuar.
        </p>
      )}
      <div className="field">
        <label htmlFor="currentPassword">Senha atual</label>
        <input className="input" id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="field">
        <label htmlFor="newPassword">Nova senha (mínimo 10 caracteres)</label>
        <input className="input" id="newPassword" name="newPassword" type="password" required minLength={10} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      {success && <p className="text-muted" style={{ fontSize: "0.85rem" }}>✓ Senha atualizada.</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
