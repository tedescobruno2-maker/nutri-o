"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateMealPlan, saveMealPlanAsTemplate, applyTemplateToClient, finalizeMealPlan, sendMealPlanToPatient } from "@/actions/mealPlans";
import type { MealPlanTemplate } from "@/generated/prisma/client";

export function PlanActionsBar({
  mealPlanId,
  clientId,
  status,
  sentAt,
  templates,
}: {
  mealPlanId: string;
  clientId: string;
  status: string;
  sentAt: Date | null;
  templates: MealPlanTemplate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [applyTemplateId, setApplyTemplateId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateMealPlan(mealPlanId, clientId);
      router.push(`/planos/${result.mealPlanId}`);
    });
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    startTransition(async () => {
      await saveMealPlanAsTemplate(mealPlanId, templateName.trim());
      setMessage(`Modelo "${templateName}" salvo.`);
      setTemplateName("");
      setShowTemplateForm(false);
    });
  }

  function handleApplyTemplate() {
    if (!applyTemplateId) return;
    startTransition(async () => {
      const result = await applyTemplateToClient(applyTemplateId, clientId);
      setShowApplyForm(false);
      router.push(`/planos/${result.mealPlanId}`);
    });
  }

  function handleFinalize() {
    startTransition(async () => {
      await finalizeMealPlan(mealPlanId, clientId);
      setMessage("Plano finalizado — os totais foram travados.");
      router.refresh();
    });
  }

  function handleSend() {
    startTransition(async () => {
      await sendMealPlanToPatient(mealPlanId, clientId);
      setMessage("Plano enviado — o paciente já pode ver no portal.");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!sentAt && (
        <span className="badge badge-warm" style={{ alignSelf: "flex-start" }}>
          🔒 Rascunho — o paciente ainda não vê este plano
        </span>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={handleDuplicate}>
          🗂️ Duplicar
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setShowTemplateForm((v) => !v)}>
          💾 Salvar como modelo
        </button>
        {templates.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setShowApplyForm((v) => !v)}>
            📥 Aplicar modelo
          </button>
        )}
        {status !== "FINALIZADO" ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={isPending} onClick={handleFinalize}>
            ✓ Finalizar
          </button>
        ) : (
          <span className="badge badge-success">Finalizado</span>
        )}
        {!sentAt ? (
          <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={handleSend}>
            📤 Enviar para o paciente
          </button>
        ) : (
          <span className="badge badge-success">📤 Enviado ao paciente</span>
        )}
      </div>

      {showTemplateForm && (
        <form ref={formRef} className="animate-in" style={{ display: "flex", gap: 8 }} onSubmit={(e) => { e.preventDefault(); handleSaveTemplate(); }}>
          <input className="input" placeholder="Nome do modelo" value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ maxWidth: 260 }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={isPending || !templateName.trim()}>Salvar</button>
        </form>
      )}

      {showApplyForm && (
        <div className="animate-in" style={{ display: "flex", gap: 8 }}>
          <select className="input" value={applyTemplateId} onChange={(e) => setApplyTemplateId(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="">Selecione um modelo...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary btn-sm" disabled={isPending || !applyTemplateId} onClick={handleApplyTemplate}>
            Aplicar (cria novo rascunho)
          </button>
        </div>
      )}

      {message && <p className="text-tertiary" style={{ fontSize: "0.78rem" }}>{message}</p>}
    </div>
  );
}
