"use client";

import { useState, useTransition } from "react";
import { submitConsultationForm } from "@/actions/consultationForm";
import { MAIN_GOALS, MAIN_GOAL_LABELS, SLEEP_QUALITY_OPTIONS, GUT_HEALTH_OPTIONS } from "@/lib/utils";

export function ConsultationFormClient({ token, defaultName }: { token: string; defaultName: string }) {
  const [doesActivity, setDoesActivity] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [sleepOther, setSleepOther] = useState("");
  const [gutHealth, setGutHealth] = useState<string | null>(null);
  const [gutOther, setGutOther] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (sleepQuality) formData.set("sleepQuality", sleepQuality === "Outro" ? sleepOther || "Outro" : sleepQuality);
    if (gutHealth) formData.set("gutHealth", gutHealth === "Outro" ? gutOther || "Outro" : gutHealth);
    startTransition(() => {
      submitConsultationForm(formData);
    });
  }

  return (
    <form action={handleSubmit} className="public-card card glass card-pad animate-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="token" value={token} />

      <div className="field">
        <label htmlFor="fullName">Nome completo *</label>
        <input className="input" id="fullName" name="fullName" required defaultValue={defaultName} />
      </div>

      <div className="field">
        <label htmlFor="document">Identidade ou CPF *</label>
        <input className="input" id="document" name="document" required />
      </div>

      <div className="field">
        <label htmlFor="profession">Profissão *</label>
        <input className="input" id="profession" name="profession" required />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field">
          <label htmlFor="height">Altura (cm)</label>
          <input className="input" id="height" name="height" type="number" step="0.1" placeholder="Ex: 165" />
        </div>
        <div className="field">
          <label htmlFor="birthDate">Data de nascimento *</label>
          <input className="input" id="birthDate" name="birthDate" type="date" required />
        </div>
      </div>

      <div className="field">
        <label>Objetivo principal *</label>
        <div className="radio-group">
          {MAIN_GOALS.map((goal) => (
            <label key={goal} className="radio-option">
              <input type="radio" name="mainGoal" value={goal} required />
              {MAIN_GOAL_LABELS[goal]}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Já faz/fez acompanhamento nutricional *</label>
        <div className="radio-group">
          <label className="radio-option">
            <input type="radio" name="hasNutritionalFollowUp" value="SIM" required /> Sim
          </label>
          <label className="radio-option">
            <input type="radio" name="hasNutritionalFollowUp" value="NAO" required /> Não
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pathology">Alguma patologia? Qual?</label>
        <input className="input" id="pathology" name="pathology" placeholder="Se não houver, deixe em branco" />
      </div>

      <div className="field">
        <label>Faz atividade física *</label>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="doesPhysicalActivity"
              value="SIM"
              required
              onChange={() => setDoesActivity("SIM")}
            />
            Sim
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="doesPhysicalActivity"
              value="NAO"
              required
              onChange={() => setDoesActivity("NAO")}
            />
            Não
          </label>
        </div>
      </div>

      {doesActivity === "SIM" && (
        <div className="field animate-in">
          <label htmlFor="physicalActivityFrequency">Quantas vezes na semana?</label>
          <input className="input" id="physicalActivityFrequency" name="physicalActivityFrequency" placeholder="Ex: 3x por semana" />
        </div>
      )}

      <div className="field">
        <label htmlFor="medications">Faz uso de algum medicamento? Quais?</label>
        <input className="input" id="medications" name="medications" placeholder="Se não houver, deixe em branco" />
      </div>

      <div className="field">
        <label>Qualidade do sono</label>
        <div className="radio-group">
          {SLEEP_QUALITY_OPTIONS.map((opt) => (
            <label key={opt} className="radio-option">
              <input type="radio" name="sleepQualityChoice" value={opt} onChange={() => setSleepQuality(opt)} />
              {opt}
            </label>
          ))}
        </div>
        {sleepQuality === "Outro" && (
          <input
            className="input animate-in"
            style={{ marginTop: 8 }}
            placeholder="Descreva"
            value={sleepOther}
            onChange={(e) => setSleepOther(e.target.value)}
          />
        )}
      </div>

      <div className="field">
        <label>Saúde intestinal</label>
        <div className="radio-group">
          {GUT_HEALTH_OPTIONS.map((opt) => (
            <label key={opt} className="radio-option">
              <input type="radio" name="gutHealthChoice" value={opt} onChange={() => setGutHealth(opt)} />
              {opt}
            </label>
          ))}
        </div>
        {gutHealth === "Outro" && (
          <input
            className="input animate-in"
            style={{ marginTop: 8 }}
            placeholder="Descreva"
            value={gutOther}
            onChange={(e) => setGutOther(e.target.value)}
          />
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 8 }}>
        {isPending ? "Enviando..." : "Enviar respostas"}
      </button>
    </form>
  );
}
