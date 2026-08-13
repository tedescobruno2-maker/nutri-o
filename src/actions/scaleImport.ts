"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { gemini, SCALE_REPORT_SCHEMA, SCALE_REPORT_PROMPT, type ScaleReportData } from "@/lib/gemini";
import { z } from "zod";

export type ExtractResult =
  | { ok: true; data: ScaleReportData }
  | { ok: false; error: string };

function parseBrDate(str: string): Date | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str.trim());
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export async function extractScaleReport(formData: FormData): Promise<ExtractResult> {
  if (!gemini) {
    return { ok: false, error: "GEMINI_API_KEY não configurada no servidor." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo PDF." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "O arquivo precisa ser um PDF." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await gemini.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [
            { text: SCALE_REPORT_PROMPT },
            { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: SCALE_REPORT_SCHEMA,
      },
    });

    const text = result.text;
    if (!text) return { ok: false, error: "A IA não retornou dados. Tente novamente." };

    const data = JSON.parse(text) as ScaleReportData;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao processar o relatório." };
  }
}

const saveSchema = z.object({
  clientId: z.string().min(1),
  examDate: z.string().min(1),
  weightKg: z.coerce.number().positive(),
  bodyFatPercent: z.coerce.number().min(0).optional(),
  fatMassKg: z.coerce.number().min(0).optional(),
  subcutaneousFatKg: z.coerce.number().min(0).optional(),
  fatFreeMassKg: z.coerce.number().min(0).optional(),
  muscleMassPercent: z.coerce.number().min(0).optional(),
  bodyWaterPercent: z.coerce.number().min(0).optional(),
  bodyWaterKg: z.coerce.number().min(0).optional(),
  bmi: z.coerce.number().min(0).optional(),
  sarcopeniaIndex: z.coerce.number().min(0).optional(),
  boneMassKg: z.coerce.number().min(0).optional(),
  bmr: z.coerce.number().min(0).optional(),
  visceralFat: z.coerce.number().min(0).optional(),
  bioScore: z.coerce.number().min(0).optional(),
  segmentalJson: z.string().optional(),
});

export async function saveScaleMeasurement(formData: FormData) {
  const parsed = saveSchema.parse(Object.fromEntries(formData));
  const { clientId, examDate, segmentalJson, ...rest } = parsed;

  const date = parseBrDate(examDate) ?? new Date();
  const segmental = segmentalJson ? JSON.parse(segmentalJson) : undefined;

  await prisma.measurement.create({
    data: {
      clientId,
      date,
      weight: rest.weightKg,
      bodyFat: rest.bodyFatPercent,
      fatMassKg: rest.fatMassKg,
      subcutaneousFatKg: rest.subcutaneousFatKg,
      fatFreeMassKg: rest.fatFreeMassKg,
      muscleMassPercent: rest.muscleMassPercent,
      bodyWaterPercent: rest.bodyWaterPercent,
      bodyWaterKg: rest.bodyWaterKg,
      bmi: rest.bmi,
      sarcopeniaIndex: rest.sarcopeniaIndex,
      boneMassKg: rest.boneMassKg,
      bmr: rest.bmr ? Math.round(rest.bmr) : undefined,
      visceralFat: rest.visceralFat ? Math.round(rest.visceralFat) : undefined,
      bioScore: rest.bioScore,
      segmental,
      source: "Balança Bioeasy Pro 1",
    },
  });

  revalidatePath(`/clients/${clientId}`);
}
