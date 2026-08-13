"use client";

import { useRef, useState, useTransition } from "react";
import { extractScaleReport, saveScaleMeasurement } from "@/actions/scaleImport";
import { cn } from "@/lib/utils";
import type { ScaleReportData } from "@/lib/gemini";

const REVIEW_FIELDS: Array<{ key: keyof ScaleReportData; label: string; unit: string; step?: string }> = [
  { key: "weightKg", label: "Peso", unit: "kg", step: "0.01" },
  { key: "bodyFatPercent", label: "% Gordura corporal", unit: "%", step: "0.01" },
  { key: "fatMassKg", label: "Massa gorda", unit: "kg", step: "0.01" },
  { key: "subcutaneousFatKg", label: "Gordura subcutânea", unit: "kg", step: "0.01" },
  { key: "fatFreeMassKg", label: "Massa livre de gordura", unit: "kg", step: "0.01" },
  { key: "muscleMassPercent", label: "% Massa muscular", unit: "%", step: "0.01" },
  { key: "bodyWaterPercent", label: "% Água corporal", unit: "%", step: "0.01" },
  { key: "bodyWaterKg", label: "Água corporal", unit: "kg", step: "0.01" },
  { key: "bmi", label: "IMC", unit: "kg/m²", step: "0.01" },
  { key: "sarcopeniaIndex", label: "Sarcopenia", unit: "", step: "0.01" },
  { key: "boneMassKg", label: "Massa óssea", unit: "kg", step: "0.01" },
  { key: "bmr", label: "TMB (metabolismo basal)", unit: "kcal", step: "1" },
  { key: "visceralFat", label: "Gordura visceral", unit: "nível", step: "1" },
  { key: "bioScore", label: "Pontuação geral", unit: "", step: "0.01" },
];

export function ImportScaleButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [examDate, setExamDate] = useState("");
  const [segmental, setSegmental] = useState<ScaleReportData["segmental"]>();
  const [patientName, setPatientName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setStep("upload");
    setError(null);
    setData({});
    formRef.current?.reset();
  }

  function handleExtract(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await extractScaleReport(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const d = result.data;
      setPatientName(d.patientName);
      setExamDate(d.examDate);
      setSegmental(d.segmental);
      const round2 = (n: number | null | undefined) => (n == null ? "" : String(Math.round(n * 100) / 100));
      setData({
        weightKg: round2(d.weightKg),
        bodyFatPercent: round2(d.bodyFatPercent),
        fatMassKg: round2(d.fatMassKg),
        subcutaneousFatKg: round2(d.subcutaneousFatKg),
        fatFreeMassKg: round2(d.fatFreeMassKg),
        muscleMassPercent: round2(d.muscleMassPercent),
        bodyWaterPercent: round2(d.bodyWaterPercent),
        bodyWaterKg: round2(d.bodyWaterKg),
        bmi: round2(d.bmi),
        sarcopeniaIndex: round2(d.sarcopeniaIndex),
        boneMassKg: round2(d.boneMassKg),
        bmr: round2(d.bmr),
        visceralFat: round2(d.visceralFat),
        bioScore: round2(d.bioScore),
      });
      setStep("review");
    });
  }

  function handleSave() {
    setError(null);
    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("examDate", examDate);
    for (const [key, value] of Object.entries(data)) {
      if (value !== "") fd.set(key, value);
    }
    if (segmental) fd.set("segmentalJson", JSON.stringify(segmental));

    startTransition(async () => {
      try {
        await saveScaleMeasurement(fd);
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar medição.");
      }
    });
  }

  const nameMismatch =
    patientName && !clientName.toLowerCase().includes(patientName.toLowerCase().split(" ")[0].toLowerCase());

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        📊 Importar dados da balança
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => { setOpen(false); reset(); }}
        >
          <div
            className="card glass card-pad animate-in"
            style={{ width: "min(600px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Importar dados da balança</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => { setOpen(false); reset(); }}>✕</button>
            </div>

            {step === "upload" && (
              <form ref={formRef} action={handleExtract} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                  Envie o relatório em PDF da balança de bioimpedância (ex: Bioeasy Pro). A IA vai ler os dados e
                  você poderá conferir tudo antes de salvar.
                </p>
                <div className="field">
                  <label htmlFor="scale-file">Arquivo PDF</label>
                  <input className="input" id="scale-file" name="file" type="file" accept="application/pdf" required />
                </div>
                {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Lendo relatório..." : "Extrair dados"}
                </button>
              </form>
            )}

            {step === "review" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className={cn("card", "card-pad")} style={{ background: nameMismatch ? "color-mix(in oklch, var(--danger) 10%, transparent)" : "var(--accent-primary-soft)" }}>
                  <p style={{ fontSize: "0.85rem" }}>
                    <strong>Paciente no relatório:</strong> {patientName || "não identificado"}
                  </p>
                  {nameMismatch && (
                    <p style={{ fontSize: "0.8rem", color: "var(--danger)", marginTop: 4 }}>
                      ⚠️ O nome no relatório não parece bater com <strong>{clientName}</strong>. Confirme se é o arquivo certo antes de salvar.
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="examDate">Data do exame</label>
                  <input
                    className="input"
                    id="examDate"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {REVIEW_FIELDS.map((field) => (
                    <div className="field" key={field.key}>
                      <label htmlFor={`f-${field.key}`}>
                        {field.label} {field.unit && `(${field.unit})`}
                      </label>
                      <input
                        className="input"
                        id={`f-${field.key}`}
                        type="number"
                        step={field.step ?? "any"}
                        value={data[field.key] ?? ""}
                        onChange={(e) => setData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>

                {segmental && (
                  <div className="card" style={{ padding: 14 }}>
                    <p className="eyebrow" style={{ marginBottom: 8 }}>Análise segmentar (somente leitura)</p>
                    <table className="data-table" style={{ fontSize: "0.78rem" }}>
                      <thead>
                        <tr>
                          <th></th>
                          <th>Tronco</th>
                          <th>Braço E</th>
                          <th>Braço D</th>
                          <th>Perna E</th>
                          <th>Perna D</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Músculo (kg)</td>
                          <td>{segmental.trunk?.muscleKg}</td>
                          <td>{segmental.leftArm?.muscleKg}</td>
                          <td>{segmental.rightArm?.muscleKg}</td>
                          <td>{segmental.leftLeg?.muscleKg}</td>
                          <td>{segmental.rightLeg?.muscleKg}</td>
                        </tr>
                        <tr>
                          <td>Gordura (kg)</td>
                          <td>{segmental.trunk?.fatKg}</td>
                          <td>{segmental.leftArm?.fatKg}</td>
                          <td>{segmental.rightArm?.fatKg}</td>
                          <td>{segmental.leftLeg?.fatKg}</td>
                          <td>{segmental.rightLeg?.fatKg}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep("upload")} disabled={isPending}>
                    ← Voltar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isPending} style={{ flex: 1 }}>
                    {isPending ? "Salvando..." : "Confirmar e salvar medição"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
