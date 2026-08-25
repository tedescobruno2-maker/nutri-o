"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { gemini, EXAM_RESULTS_SCHEMA, EXAM_RESULTS_PROMPT, type ExamResultsData } from "@/lib/gemini";
import { saveUploadedDocument } from "@/actions/upload";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function parseBrDate(str: string): Date | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str.trim());
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export type ImportExamResultsSummary = {
  parametersImported: number;
  pointsImported: number;
  attentionParams: string[];
};

export type ImportExamResultsResponse =
  | { ok: true; summary: ImportExamResultsSummary }
  | { ok: false; error: string };

export async function importExamResultsPdf(formData: FormData): Promise<ImportExamResultsResponse> {
  if (!gemini) {
    return { ok: false, error: "GEMINI_API_KEY não configurada no servidor." };
  }

  const clientId = formData.get("clientId") as string | null;
  const file = formData.get("file") as File | null;
  if (!clientId) return { ok: false, error: "Paciente não informado." };
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo PDF." };
  if (file.type !== "application/pdf") return { ok: false, error: "O arquivo precisa ser um PDF." };

  // Relatórios laboratoriais podem ter muitas páginas/parâmetros — a resposta em JSON fica grande,
  // por isso maxOutputTokens é elevado. Tenta o modelo principal primeiro; se estiver sobrecarregado
  // (503), cai para o modelo "lite" — mais leve e normalmente com menos contenção de demanda.
  const buffer = Buffer.from(await file.arrayBuffer());
  const contents = [
    {
      role: "user" as const,
      parts: [
        { text: EXAM_RESULTS_PROMPT },
        { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
      ],
    },
  ];
  const config = { responseMimeType: "application/json", responseSchema: EXAM_RESULTS_SCHEMA, maxOutputTokens: 65535 };

  let data: ExamResultsData;
  try {
    let text: string | undefined;
    try {
      const result = await gemini.models.generateContent({ model: "gemini-flash-latest", contents, config });
      text = result.text;
    } catch (err) {
      const isOverloaded = err instanceof Error && /503|UNAVAILABLE|overloaded|high demand/i.test(err.message);
      if (!isOverloaded) throw err;
      const result = await gemini.models.generateContent({ model: "gemini-flash-lite-latest", contents, config });
      text = result.text;
    }

    if (!text) return { ok: false, error: "A IA não retornou dados. Tente novamente." };
    data = JSON.parse(text) as ExamResultsData;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao processar o relatório." };
  }

  if (!data.results || data.results.length === 0) {
    return { ok: false, error: "Nenhum parâmetro de exame foi reconhecido neste PDF." };
  }

  const actor = await getCurrentUser();
  await logAudit({ actorUserId: actor?.id, action: "CHAMADA_IA", entity: "ExamResult", clientId, metadata: { finalidade: "leitura_exames", parametros: data.results.length } });

  const sourceFileUrl = await saveUploadedDocument(file, "exame-resultados");
  const importBatchId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let pointsImported = 0;
  const attentionParams: string[] = [];

  for (const item of data.results) {
    const points = item.series
      .map((p) => ({ date: parseBrDate(p.date), value: p.value }))
      .filter((p): p is { date: Date; value: number } => !!p.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (points.length === 0) continue;

    const hasRange = item.referenceMin != null || item.referenceMax != null;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const isLatest = i === points.length - 1;

      let flag: "NORMAL" | "ATENCAO" | "INDETERMINADO";
      if (hasRange) {
        const belowMin = item.referenceMin != null && point.value < item.referenceMin;
        const aboveMax = item.referenceMax != null && point.value > item.referenceMax;
        flag = belowMin || aboveMax ? "ATENCAO" : "NORMAL";
      } else {
        flag = isLatest ? item.currentFlag : "INDETERMINADO";
      }

      await prisma.examResult.upsert({
        where: {
          clientId_parameterName_collectedAt: {
            clientId,
            parameterName: item.parameterName,
            collectedAt: point.date,
          },
        },
        update: {
          value: point.value,
          unit: item.unit,
          referenceMin: item.referenceMin ?? undefined,
          referenceMax: item.referenceMax ?? undefined,
          referenceText: item.referenceText,
          flag,
          sourceFileUrl: sourceFileUrl ?? undefined,
          importBatchId,
        },
        create: {
          clientId,
          parameterName: item.parameterName,
          value: point.value,
          unit: item.unit,
          collectedAt: point.date,
          referenceMin: item.referenceMin ?? undefined,
          referenceMax: item.referenceMax ?? undefined,
          referenceText: item.referenceText,
          flag,
          sourceFileUrl: sourceFileUrl ?? undefined,
          importBatchId,
        },
      });
      pointsImported++;

      if (isLatest && flag === "ATENCAO") attentionParams.push(item.parameterName);
    }
  }

  // Melhor-esforço: marca exames "Solicitado" correspondentes como com resultado recebido.
  const pendingExams = await prisma.exam.findMany({ where: { clientId, status: "SOLICITADO" } });
  for (const exam of pendingExams) {
    const examNameLower = exam.name.toLowerCase();
    const match = data.results.find(
      (r) =>
        r.parameterName.toLowerCase().includes(examNameLower) || examNameLower.includes(r.parameterName.toLowerCase())
    );
    if (match) {
      const latestPoint = [...match.series].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
      const resultDate = latestPoint ? parseBrDate(latestPoint.date) : undefined;
      await prisma.exam.update({
        where: { id: exam.id },
        data: { status: "RESULTADO_RECEBIDO", resultDate: resultDate ?? new Date(), fileUrl: sourceFileUrl ?? undefined },
      });
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/exames`);

  return {
    ok: true,
    summary: { parametersImported: data.results.length, pointsImported, attentionParams },
  };
}

export async function deleteExamResultParameter(clientId: string, parameterName: string) {
  await prisma.examResult.deleteMany({ where: { clientId, parameterName } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/exames`);
}
