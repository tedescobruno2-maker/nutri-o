"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Medidas caseiras (5.2.2/9.3) — sempre gravadas por ação explícita da nutricionista (o botão
 * "Salvar" da UI), nunca automaticamente a partir de uma sugestão de IA. `wasAiSuggested` só é
 * true quando o número salvo veio direto da sugestão sem edição — vira `source = IA_ESTIMADA`
 * em vez de `MANUAL`, para manter rastreável de onde veio cada medida.
 */

const createSchema = z.object({
  foodId: z.string().min(1),
  label: z.string().min(1, "Nome da medida é obrigatório"),
  grams: z.coerce.number().positive("Gramatura precisa ser maior que zero"),
  wasAiSuggested: z.boolean().optional(),
  aiReasoning: z.string().optional(),
});

export async function createFoodMeasure(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.parse(input);

  await prisma.foodMeasure.create({
    data: {
      foodId: parsed.foodId,
      label: parsed.label,
      grams: parsed.grams,
      source: parsed.wasAiSuggested ? "IA_ESTIMADA" : "MANUAL",
      sourceRef: parsed.wasAiSuggested && parsed.aiReasoning ? `Sugestão por IA (Gemini): ${parsed.aiReasoning}` : null,
    },
  });

  revalidatePath("/alimentos");
}

const updateSchema = z.object({
  id: z.string().min(1),
  grams: z.coerce.number().positive("Gramatura precisa ser maior que zero"),
});

export async function updateFoodMeasure(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.parse(input);
  await prisma.foodMeasure.update({
    where: { id: parsed.id },
    // Editada manualmente depois — deixa de ser um valor de IA não revisado.
    data: { grams: parsed.grams, source: "MANUAL", sourceRef: null },
  });
  revalidatePath("/alimentos");
}

export async function deleteFoodMeasure(id: string) {
  await prisma.foodMeasure.delete({ where: { id } });
  revalidatePath("/alimentos");
}
