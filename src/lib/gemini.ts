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
