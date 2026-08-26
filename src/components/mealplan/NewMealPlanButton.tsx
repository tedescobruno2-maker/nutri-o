"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMealPlan } from "@/actions/mealPlans";
import { GuidanceTextPicker } from "@/components/mealplan/GuidanceTextPicker";

type GuidanceTextBasic = { id: string; title: string; content: string; type: string };

export function NewMealPlanButton({
  clientId,
  hasPlan,
  patientStatedGoal,
  guidanceTexts,
}: {
  clientId: string;
  hasPlan: boolean;
  patientStatedGoal?: string | null;
  guidanceTexts: GuidanceTextBasic[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMealPlan(formData);
      formRef.current?.reset();
      setOpen(false);
      router.push(`/planos/${result.mealPlanId}`);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        {hasPlan ? "+ Novo plano (substitui o atual)" : "+ Criar plano alimentar"}
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => setOpen(false)}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
                <textarea
                  className="input"
                  id="mp-objective"
                  name="objective"
                  rows={2}
                  defaultValue={patientStatedGoal ?? ""}
                  placeholder="Ex: Redução de gordura, preservando massa muscular."
                />
                {patientStatedGoal && (
                  <p className="text-tertiary" style={{ fontSize: "0.74rem", marginTop: 4 }}>
                    Pré-preenchido com o que o paciente respondeu no formulário — edite à vontade, isso não altera a resposta original.
                  </p>
                )}
              </div>

              <GuidanceTextPicker texts={guidanceTexts} name="generalGuidelines" />

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
