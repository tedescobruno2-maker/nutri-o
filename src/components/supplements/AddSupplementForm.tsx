"use client";

import { useRef, useState, useTransition } from "react";
import { addClientSupplement } from "@/actions/supplements";

export function AddSupplementForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addClientSupplement(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Adicionar suplemento
      </button>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="clientId" value={clientId} />
      <input className="input" name="name" required placeholder="Ex: Whey concentrado" />
      <textarea className="input" name="instructions" rows={2} required placeholder="Ex: 1 dose ao dia, no café da manhã" />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
