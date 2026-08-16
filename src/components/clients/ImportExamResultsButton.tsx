"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importExamResultsPdf, type ImportExamResultsSummary } from "@/actions/examResults";

export function ImportExamResultsButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportExamResultsSummary | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setError(null);
    setSummary(null);
    formRef.current?.reset();
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await importExamResultsPdf(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        📥 Importar resultados (PDF)
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => { setOpen(false); reset(); }}
        >
          <div
            className="card glass card-pad animate-in"
            style={{ width: "min(520px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Importar resultados de exames</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => { setOpen(false); reset(); }}>✕</button>
            </div>

            {!summary ? (
              <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input type="hidden" name="clientId" value={clientId} />
                <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                  Envie o relatório laboratorial em PDF. A IA vai ler todos os parâmetros de exame (inclusive o
                  histórico já impresso no relatório), atualizar o banco de dados do paciente e sinalizar os valores
                  fora da faixa de referência.
                </p>
                <div className="field">
                  <label htmlFor="exam-pdf-file">Arquivo PDF</label>
                  <input className="input" id="exam-pdf-file" name="file" type="file" accept="application/pdf" required />
                </div>
                {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Lendo e importando (pode levar um minuto)..." : "Importar"}
                </button>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="card card-pad" style={{ background: "var(--accent-primary-soft)" }}>
                  <p style={{ fontSize: "0.9rem", fontWeight: 700 }}>✅ Importação concluída</p>
                  <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
                    {summary.parametersImported} parâmetro(s) de exame · {summary.pointsImported} ponto(s) no total
                    (incluindo histórico já impresso no relatório).
                  </p>
                </div>

                {summary.attentionParams.length > 0 ? (
                  <div className="card card-pad" style={{ background: "color-mix(in oklch, var(--accent-warm) 12%, transparent)" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 6 }}>
                      ⚠️ {summary.attentionParams.length} parâmetro(s) fora da faixa de referência:
                    </p>
                    <ul style={{ paddingLeft: 18, fontSize: "0.83rem", display: "flex", flexDirection: "column", gap: 2 }}>
                      {summary.attentionParams.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                    Nenhum parâmetro sinalizado como fora da faixa no resultado mais recente.
                  </p>
                )}

                <p className="text-tertiary" style={{ fontSize: "0.72rem" }}>
                  A leitura automática pode conter imprecisões — confira os valores importados antes de usar
                  clinicamente. A interpretação diagnóstica é sempre um ato médico.
                </p>

                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/clients/${clientId}/exames`} className="btn btn-primary" style={{ flex: 1, textAlign: "center" }}>
                    Ver histórico de exames →
                  </Link>
                  <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); reset(); }}>
                    Fechar
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
