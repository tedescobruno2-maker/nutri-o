"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { gemini, EXAM_RESULTS_SCHEMA, EXAM_RESULTS_PROMPT, type ExamResultsData } from "@/lib/gemini";
import { saveUploadedDocument } from "@/actions/upload";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { matchExamParameter } from "@/lib/examParameterMatch";
import { computeEffectiveFlag } from "@/lib/examFlags";

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
  unmatchedParameters: string[];
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
  const actor = await getCurrentUser();

  let data: ExamResultsData;
  let modelUsed = "gemini-flash-latest";
  let outputTokens: number | null = null;
  try {
    let text: string | undefined;
    try {
      const result = await gemini.models.generateContent({ model: modelUsed, contents, config });
      text = result.text;
      outputTokens = result.usageMetadata?.totalTokenCount ?? null;
    } catch (err) {
      const isOverloaded = err instanceof Error && /503|UNAVAILABLE|overloaded|high demand/i.test(err.message);
      if (!isOverloaded) throw err;
      modelUsed = "gemini-flash-lite-latest";
      const result = await gemini.models.generateContent({ model: modelUsed, contents, config });
      text = result.text;
      outputTokens = result.usageMetadata?.totalTokenCount ?? null;
    }

    if (!text) throw new Error("A IA não retornou dados. Tente novamente.");
    data = JSON.parse(text) as ExamResultsData;
  } catch (err) {
    const errorText = err instanceof Error ? err.message : "Falha ao processar o relatório.";
    await prisma.aiUsageLog.create({
      data: { purpose: "importar_exame", model: modelUsed, clientId, userId: actor?.id, inputBytes: buffer.length, success: false, errorText },
    });
    return { ok: false, error: errorText };
  }

  if (!data.results || data.results.length === 0) {
    await prisma.aiUsageLog.create({
      data: { purpose: "importar_exame", model: modelUsed, clientId, userId: actor?.id, inputBytes: buffer.length, outputTokens, success: false, errorText: "Nenhum parâmetro reconhecido" },
    });
    return { ok: false, error: "Nenhum parâmetro de exame foi reconhecido neste PDF." };
  }

  await prisma.aiUsageLog.create({
    data: { purpose: "importar_exame", model: modelUsed, clientId, userId: actor?.id, inputBytes: buffer.length, outputTokens, success: true },
  });
  await logAudit({ actorUserId: actor?.id, action: "CHAMADA_IA", entity: "ExamResult", clientId, metadata: { finalidade: "leitura_exames", parametros: data.results.length } });

  // 5.7.1/5.7.3: casa parameterName com o catálogo por alias — quando não casar, fica null e o
  // relatório de importação lista para a Luana catalogar depois (nunca é tratado como erro).
  const catalog = await prisma.examParameter.findMany();
  const unmatchedParameters: string[] = [];

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

    const parameter = matchExamParameter(item.parameterName, catalog);
    if (!parameter) unmatchedParameters.push(item.parameterName);
    const clientRef = parameter
      ? await prisma.clientExamReference.findUnique({
          where: { clientId_parameterId: { clientId, parameterId: parameter.id } },
        })
      : null;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const isLatest = i === points.length - 1;

      // Legado (5.7 mantém o campo `flag`): calculado só a partir da faixa impressa no laudo.
      let flag: "NORMAL" | "ATENCAO" | "INDETERMINADO";
      if (hasRange) {
        const belowMin = item.referenceMin != null && point.value < item.referenceMin;
        const aboveMax = item.referenceMax != null && point.value > item.referenceMax;
        flag = belowMin || aboveMax ? "ATENCAO" : "NORMAL";
      } else {
        flag = isLatest ? item.currentFlag : "INDETERMINADO";
      }

      // Novo (5.7): precedência faixa do paciente → catálogo → laudo → indeterminado.
      const effective = computeEffectiveFlag(point.value, {
        clientRefMin: clientRef?.refMin ?? null,
        clientRefMax: clientRef?.refMax ?? null,
        catalogDefaultMin: parameter?.defaultMin ?? null,
        catalogDefaultMax: parameter?.defaultMax ?? null,
        labReferenceMin: item.referenceMin ?? null,
        labReferenceMax: item.referenceMax ?? null,
      });

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
          parameterId: parameter?.id ?? null,
          effectiveFlag: effective.flag,
          flagSource: effective.source,
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
          parameterId: parameter?.id ?? null,
          effectiveFlag: effective.flag,
          flagSource: effective.source,
          sourceFileUrl: sourceFileUrl ?? undefined,
          importBatchId,
        },
      });
      pointsImported++;

      if (isLatest && effective.flag === "ATENCAO") attentionParams.push(item.parameterName);
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
    summary: { parametersImported: data.results.length, pointsImported, attentionParams, unmatchedParameters },
  };
}

export async function deleteExamResultParameter(clientId: string, parameterName: string) {
  await prisma.examResult.deleteMany({ where: { clientId, parameterName } });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/exames`);
}
