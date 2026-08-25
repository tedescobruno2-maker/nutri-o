/**
 * Regra de precedência da faixa efetiva (3.5 do plano mestre, Fase 7):
 * ClientExamReference (faixa do paciente) → ExamParameter.default* (catálogo) →
 * faixa impressa no laudo → INDETERMINADO.
 *
 * A faixa impressa no laudo (ExamResult.referenceMin/Max) NUNCA é sobrescrita — só deixa de ser
 * usada no cálculo quando existe uma faixa mais específica (paciente ou catálogo).
 */

export type ExamFlag = "NORMAL" | "ATENCAO" | "INDETERMINADO";
export type FlagSource = "faixa do paciente" | "catálogo" | "laudo" | null;

export type EffectiveFlagResult = { flag: ExamFlag; source: FlagSource };

function flagFromRange(value: number, min: number | null, max: number | null): ExamFlag {
  const belowMin = min != null && value < min;
  const aboveMax = max != null && value > max;
  return belowMin || aboveMax ? "ATENCAO" : "NORMAL";
}

export function computeEffectiveFlag(
  value: number,
  ranges: {
    clientRefMin: number | null;
    clientRefMax: number | null;
    catalogDefaultMin: number | null;
    catalogDefaultMax: number | null;
    labReferenceMin: number | null;
    labReferenceMax: number | null;
  }
): EffectiveFlagResult {
  if (ranges.clientRefMin != null || ranges.clientRefMax != null) {
    return { flag: flagFromRange(value, ranges.clientRefMin, ranges.clientRefMax), source: "faixa do paciente" };
  }
  if (ranges.catalogDefaultMin != null || ranges.catalogDefaultMax != null) {
    return { flag: flagFromRange(value, ranges.catalogDefaultMin, ranges.catalogDefaultMax), source: "catálogo" };
  }
  if (ranges.labReferenceMin != null || ranges.labReferenceMax != null) {
    return { flag: flagFromRange(value, ranges.labReferenceMin, ranges.labReferenceMax), source: "laudo" };
  }
  return { flag: "INDETERMINADO", source: null };
}
