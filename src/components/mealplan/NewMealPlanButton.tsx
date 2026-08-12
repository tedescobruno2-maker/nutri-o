"use client";

import { useRef, useState, useTransition } from "react";
import { createMealPlan } from "@/actions/mealPlans";

export function NewMealPlanButton({ clientId, hasPlan }: { clientId: string; hasPlan: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createMealPlan(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        {hasPlan ? "+ Novo plano (substitui o atual)" : "+ Criar plano alimentar"}
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(520px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Novo plano alimentar</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="hidden" name="clientId" value={clientId} />
              <div className="field">
                <label htmlFor="mp-title">Título</label>
                <input className="input" id="mp-title" name="title" defaultValue="Plano Alimentar" required />
              </div>
              <div className="field">
                <label htmlFor="mp-objective">Objetivo</label>
                <textarea className="input" id="mp-objective" name="objective" rows={2} placeholder="Ex: Redução de gordura, preservando massa muscular." />
              </div>
              <div className="field">
                <label htmlFor="mp-guidelines">Orientações gerais (uma por linha)</label>
                <textarea className="input" id="mp-guidelines" name="generalGuidelines" rows={4} placeholder={"Aumentar ingesta hídrica...\nEvitar carboidratos refinados..."} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Salvando..." : "Criar plano"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
