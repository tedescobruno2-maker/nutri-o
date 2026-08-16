import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
export const gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;

const segmentSchema = {
  type: Type.OBJECT,
  properties: {
    muscleKg: { type: Type.NUMBER },
    fatKg: { type: Type.NUMBER },
    fatLevelPercent: { type: Type.NUMBER },
  },
};

export const SCALE_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patientName: { type: Type.STRING },
    examDate: { type: Type.STRING, description: "formato DD/MM/AAAA" },
    weightKg: { type: Type.NUMBER },
    bodyFatPercent: { type: Type.NUMBER },
    fatMassKg: { type: Type.NUMBER },
    subcutaneousFatKg: { type: Type.NUMBER, nullable: true },
    fatFreeMassKg: { type: Type.NUMBER },
    muscleMassPercent: { type: Type.NUMBER },
    bodyWaterPercent: { type: Type.NUMBER },
    bodyWaterKg: { type: Type.NUMBER },
    bmi: { type: Type.NUMBER },
    sarcopeniaIndex: { type: Type.NUMBER },
    boneMassKg: { type: Type.NUMBER },
    bmr: { type: Type.NUMBER },
    visceralFat: { type: Type.NUMBER },
    bioScore: { type: Type.NUMBER },
    segmental: {
      type: Type.OBJECT,
      properties: {
        trunk: segmentSchema,
        leftArm: segmentSchema,
        rightArm: segmentSchema,
        leftLeg: segmentSchema,
        rightLeg: segmentSchema,
      },
    },
  },
  required: [
    "patientName",
    "examDate",
    "weightKg",
    "bodyFatPercent",
    "fatMassKg",
    "fatFreeMassKg",
    "muscleMassPercent",
    "bodyWaterPercent",
    "bodyWaterKg",
    "bmi",
    "sarcopeniaIndex",
    "boneMassKg",
    "bmr",
    "visceralFat",
    "bioScore",
  ],
};

export const SCALE_REPORT_PROMPT = `Extraia os dados deste relatório de bioimpedância (balança de composição corporal) para o JSON pedido.
Use exatamente os valores mostrados no relatório, sem arredondar, converter unidades ou inventar valores.
"examDate" é a data do exame, no formato DD/MM/AAAA.
Os campos do segmentar (tronco, braços, pernas) vêm da seção "ANÁLISE SEGMENTAR":
- muscleKg = valores da primeira tabela (massa muscular por segmento, em KG)
- fatKg = valores da linha "Média MA segmentada" (em KG)
- fatLevelPercent = valores da linha "Nível de Gordura" (em %)
Se algum campo opcional não existir no relatório, omita-o ou retorne null.`;

export type ScaleReportData = {
  patientName: string;
  examDate: string;
  weightKg: number;
  bodyFatPercent: number;
  fatMassKg: number;
  subcutaneousFatKg?: number | null;
  fatFreeMassKg: number;
  muscleMassPercent: number;
  bodyWaterPercent: number;
  bodyWaterKg: number;
  bmi: number;
  sarcopeniaIndex: number;
  boneMassKg: number;
  bmr: number;
  visceralFat: number;
  bioScore: number;
  segmental?: {
    trunk?: { muscleKg: number; fatKg: number; fatLevelPercent: number };
    leftArm?: { muscleKg: number; fatKg: number; fatLevelPercent: number };
    rightArm?: { muscleKg: number; fatKg: number; fatLevelPercent: number };
    leftLeg?: { muscleKg: number; fatKg: number; fatLevelPercent: number };
    rightLeg?: { muscleKg: number; fatKg: number; fatLevelPercent: number };
  };
};

// ---------------------------------------------------------------------------
// Extração de resultados de exames laboratoriais (relatório em PDF)
// ---------------------------------------------------------------------------

const examSeriesPointSchema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING, description: "Data da coleta, formato DD/MM/AAAA" },
    value: { type: Type.NUMBER },
  },
  required: ["date", "value"],
};

export const EXAM_RESULTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patientNameOnReport: { type: Type.STRING },
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          parameterName: { type: Type.STRING },
          unit: { type: Type.STRING },
          referenceText: { type: Type.STRING },
          referenceMin: { type: Type.NUMBER, nullable: true },
          referenceMax: { type: Type.NUMBER, nullable: true },
          currentFlag: { type: Type.STRING, enum: ["NORMAL", "ATENCAO", "INDETERMINADO"] },
          series: { type: Type.ARRAY, items: examSeriesPointSchema },
        },
        required: ["parameterName", "unit", "referenceText", "currentFlag", "series"],
      },
    },
  },
  required: ["patientNameOnReport", "results"],
};

export const EXAM_RESULTS_PROMPT = `Este é um relatório laboratorial (pode ter várias páginas), cada página normalmente traz um ou mais parâmetros de exame.
Para CADA parâmetro de exame distinto encontrado no documento inteiro (percorra TODAS as páginas), extraia um item em "results" com:

- parameterName: nome exato do exame como impresso (ex: "Ferritina Sérica", "Glicemia de Jejum", "Colesterol - HDL"). Quando uma página tiver dois sub-resultados
  distintos (ex: "Nitrogênio Ureico (BUN)" e "Ureia" na mesma seção, ou "TGP/ALT" e "TGO/AST"), trate cada um como um item SEPARADO em "results".
- unit: a unidade impressa (ex: "mg/dL", "ng/mL", "U/L").
- referenceText: copie o texto do "V.R." (valor de referência) tal como impresso, incluindo todas as categorias/condições mostradas (não resuma).
- referenceMin / referenceMax: SOMENTE quando existir um único intervalo numérico claramente aplicável a ESTE paciente (use sexo e idade impressos no cabeçalho
  do relatório — campo "Idade/Sexo" — para escolher a linha correta quando o V.R. tiver várias categorias por sexo/idade). Se o V.R. for "Inferior a X", preencha
  apenas referenceMax = X. Se for "Superior a X" ou "Acima de X", preencha apenas referenceMin = X. Se o V.R. depender de fatores clínicos externos (ex: risco
  cardiovascular pré-calculado pelo médico, categorias de gestante vs não-gestante sem essa informação disponível, ou tabelas de várias faixas sem uma única
  aplicável), NÃO preencha referenceMin/referenceMax — deixe nulos.
- currentFlag: sua avaliação do valor MAIS RECENTE (o resultado principal da página, normalmente o maior valor em destaque, não os "Anteriores") em relação ao
  V.R.: "NORMAL" se dentro da faixa desejável/normal; "ATENCAO" se fora da faixa normal, na faixa de risco, deficiência, elevado, ou qualquer categoria que não
  seja a desejável/normal; "INDETERMINADO" se não for possível avaliar com segurança a partir do documento (faixa depende de dado clínico externo, ou o próprio
  documento não classifica).
- series: TODOS os pontos histórico mostrados no gráfico/tabela "Anteriores" daquele parâmetro, incluindo o valor atual/mais recente como o último ponto (em
  ordem cronológica). Cada ponto tem "date" (DD/MM/AAAA, ignore o horário) e "value" (número). Use exatamente os valores e datas impressos nos eixos dos
  gráficos — não invente, não arredonde, não interpole.

Não invente parâmetros, valores ou datas que não estejam no documento. Se um parâmetro não tiver gráfico histórico (só o valor atual), "series" deve conter
apenas esse único ponto.`;

export type ExamResultsData = {
  patientNameOnReport: string;
  results: Array<{
    parameterName: string;
    unit: string;
    referenceText: string;
    referenceMin?: number | null;
    referenceMax?: number | null;
    currentFlag: "NORMAL" | "ATENCAO" | "INDETERMINADO";
    series: Array<{ date: string; value: number }>;
  }>;
};
