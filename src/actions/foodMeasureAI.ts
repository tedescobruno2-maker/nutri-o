"use server";

import { prisma } from "@/lib/db";
import { gemini, FOOD_MEASURE_SUGGEST_SCHEMA, FOOD_MEASURE_SUGGEST_PROMPT, type FoodMeasureSuggestData } from "@/lib/gemini";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

/**
 * <<DECISÃO BRUNO>> 9.3, respondida em 26/08/2026: IA sugere a gramatura de uma medida caseira;
 * a nutricionista sempre revisa e confirma antes de qualquer gravação — nada aqui grava direto no
 * banco (isso só acontece em createFoodMeasure/updateFoodMeasure, em foodMeasures.ts, quando ela
 * aciona "Salvar"). Igual ao padrão já usado em foodAI.ts (5.10.2: "IA só sugere").
 */
export type SuggestMeasureResult = { ok: true; data: FoodMeasureSuggestData } | { ok: false; error: string };

export async function suggestFoodMeasureGrams(foodId: string, measureLabel: string): Promise<SuggestMeasureResult> {
  if (!gemini) return { ok: false, error: "GEMINI_API_KEY não configurada no servidor." };
  if (!measureLabel.trim()) return { ok: false, error: "Digite o nome da medida primeiro (ex: \"1 colher de sopa\")." };

  const food = await prisma.food.findUnique({ where: { id: foodId }, select: { name: true } });
  if (!food) return { ok: false, error: "Alimento não encontrado." };

  const actor = await getCurrentUser();
  const contents = [{ role: "user" as const, parts: [{ text: FOOD_MEASURE_SUGGEST_PROMPT(food.name, measureLabel) }] }];
  const config = { responseMimeType: "application/json", responseSchema: FOOD_MEASURE_SUGGEST_SCHEMA };

  let data: FoodMeasureSuggestData;
  let modelUsed = "gemini-flash-latest";
  try {
    let text: string | undefined;
    try {
      const result = await gemini.models.generateContent({ model: modelUsed, contents, config });
      text = result.text;
    } catch (err) {
      const isOverloaded = err instanceof Error && /503|UNAVAILABLE|overloaded|high demand/i.test(err.message);
      if (!isOverloaded) throw err;
      modelUsed = "gemini-flash-lite-latest";
      const result = await gemini.models.generateContent({ model: modelUsed, contents, config });
      text = result.text;
    }

    if (!text) {
      await prisma.aiUsageLog.create({ data: { purpose: "sugerir_medida_caseira", model: modelUsed, userId: actor?.id, success: false, errorText: "sem resposta" } });
      return { ok: false, error: "A IA não retornou dados. Tente novamente." };
    }
    data = JSON.parse(text) as FoodMeasureSuggestData;
  } catch (err) {
    const errorText = err instanceof Error ? err.message : "Falha ao consultar a IA.";
    await prisma.aiUsageLog.create({ data: { purpose: "sugerir_medida_caseira", model: modelUsed, userId: actor?.id, success: false, errorText } });
    return { ok: false, error: errorText };
  }

  await prisma.aiUsageLog.create({
    data: { purpose: "sugerir_medida_caseira", model: modelUsed, userId: actor?.id, outputTokens: null, success: true },
  });
  await logAudit({ actorUserId: actor?.id, action: "CHAMADA_IA", entity: "FoodMeasure", metadata: { finalidade: "sugestao_medida_caseira", alimento: food.name, medida: measureLabel } });

  return { ok: true, data };
}
