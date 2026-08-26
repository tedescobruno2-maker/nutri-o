"use client";

import { useState, useTransition } from "react";
import { beginMfaSetup, confirmMfaSetup, disableMfa, type BeginMfaResult } from "@/actions/account";

export function MfaSetup({ enabled, required }: { enabled: boolean; required?: boolean }) {
  const [setup, setSetup] = useState<BeginMfaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await beginMfaSetup();
      setSetup(result);
    });
  }

  function handleConfirm(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await confirmMfaSetup(formData);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível ativar o MFA.");
        return;
      }
      setDone(true);
    });
  }

  function handleDisable(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await disableMfa(formData);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível desativar o MFA.");
        return;
      }
      setDisabled(true);
    });
  }

  if (disabled) {
    return (
      <div className="card card-pad" style={{ maxWidth: 480 }}>
        <p style={{ fontWeight: 700 }}>Verificação em duas etapas desativada</p>
        <p className="text-muted" style={{ fontSize: "0.85rem" }}>Você pode reativar quando quiser, logo abaixo.</p>
      </div>
    );
  }

  if (enabled || done) {
    return (
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        <div>
          <p style={{ fontWeight: 700 }}>✓ Verificação em duas etapas ativada</p>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Sua conta exige o código do aplicativo autenticador a cada login.
          </p>
        </div>
        {!showDisable ? (
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowDisable(true)}>
            Desativar
          </button>
        ) : (
          <form action={handleDisable} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <p className="text-tertiary" style={{ fontSize: "0.8rem" }}>Confirme sua senha atual pra desativar.</p>
            <div className="field">
              <label htmlFor="mfa-disable-password">Senha atual</label>
              <input className="input" id="mfa-disable-password" name="currentPassword" type="password" required />
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
                {isPending ? "Desativando..." : "Confirmar desativação"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowDisable(false); setError(null); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      {required && (
        <p style={{ fontSize: "0.85rem", color: "var(--danger)" }}>
          A verificação em duas etapas é obrigatória para a conta principal.
        </p>
      )}
      {!setup ? (
        <button type="button" className="btn btn-primary" onClick={handleStart} disabled={isPending}>
          {isPending ? "Gerando..." : "Ativar verificação em duas etapas"}
        </button>
      ) : (
        <form action={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="secret" value={setup.secret} />
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Escaneie o QR code com um aplicativo autenticador (Google Authenticator, Authy, etc.) e digite o código de 6 dígitos.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrDataUrl} alt="QR code para configurar o autenticador" style={{ width: 200, height: 200, alignSelf: "center" }} />
          <p className="text-tertiary" style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>
            Não consegue escanear? Digite manualmente: {setup.secret}
          </p>
          <div className="field">
            <label htmlFor="mfa-code">Código de 6 dígitos</label>
            <input className="input" id="mfa-code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} required />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? "Confirmando..." : "Confirmar e ativar"}
          </button>
        </form>
      )}
    </div>
  );
}
