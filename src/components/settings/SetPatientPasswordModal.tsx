"use client";

import { useState, useTransition } from "react";
import { setPatientPasswordDirectly } from "@/actions/portalAccess";

export function SetPatientPasswordModal({ clientId, patientName, trigger }: { clientId: string; patientName: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setPatientPasswordDirectly(clientId, formData);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível definir a senha.");
        return;
      }
      setDone(true);
    });
  }

  function close() {
    setOpen(false);
    setDone(false);
    setError(null);
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}
          onClick={close}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(420px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Definir senha — {patientName}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={close}>✕</button>
            </div>

            {done ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: "0.88rem" }}>✓ Senha definida. O paciente vai precisar trocá-la no próximo acesso, e sessões abertas foram encerradas.</p>
                <button type="button" className="btn btn-ghost" onClick={close}>Fechar</button>
              </div>
            ) : (
              <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p className="text-tertiary" style={{ fontSize: "0.78rem" }}>
                  Use isto só quando o paciente estiver com você (presencial ou por telefone). Prefira &quot;Reiniciar senha&quot; (envia link por e-mail/WhatsApp) quando possível.
                </p>
                <div className="field">
                  <label htmlFor="pw-new">Nova senha (mínimo 8 caracteres)</label>
                  <input className="input" id="pw-new" name="newPassword" type="text" minLength={8} required autoComplete="off" />
                </div>
                {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Salvando..." : "Definir senha"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
