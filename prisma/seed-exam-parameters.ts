import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { EXAMS_CATALOG } from "../src/lib/examsCatalog";
import { namesMatch } from "../src/lib/examParameterMatch";

/**
 * Popula ExamParameter (5.7.1) a partir de duas fontes: (a) src/lib/examsCatalog.ts, os exames
 * solicitáveis já usados na tela de solicitação; (b) `SELECT DISTINCT parameterName FROM
 * ExamResult` do banco real — nomes que a IA já extraiu de laudos importados.
 *
 * defaultMin/defaultMax ficam sempre null — faixa laboratorial varia por método/sexo/idade, e
 * preenchê-la de memória seria inventar (<<DECISÃO BRUNO>> 9.10, já resolvida como "deixar vazio").
 *
 * Idempotente: upsert por `canonicalName`.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

// Algumas entradas do catálogo de solicitação descrevem mais de um parâmetro de resultado —
// expandidas aqui em parâmetros canônicos individuais (o que aparece separado num laudo real).
const EXPANSIONS: Record<string, string[]> = {
  "Colesterol total e frações (HDL, LDL, VLDL)": ["Colesterol total", "HDL", "LDL", "VLDL"],
  "Sódio e Potássio": ["Sódio", "Potássio"],
  "Transferrina/Saturação de transferrina": ["Transferrina", "Saturação de transferrina"],
  "Bilirrubinas totais e frações": ["Bilirrubina total", "Bilirrubina direta", "Bilirrubina indireta"],
};

async function main() {
  const canonicalEntries: Array<{ canonicalName: string; category: string }> = [];
  for (const group of EXAMS_CATALOG) {
    for (const exam of group.exams) {
      const expanded = EXPANSIONS[exam] ?? [exam];
      for (const name of expanded) canonicalEntries.push({ canonicalName: name, category: group.category });
    }
  }

  const realNames = (
    await prisma.examResult.findMany({ select: { parameterName: true }, distinct: ["parameterName"] })
  ).map((r) => r.parameterName);

  const usedRealNames = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const entry of canonicalEntries) {
    const aliasHits = realNames.filter((real) => namesMatch(real, entry.canonicalName));
    aliasHits.forEach((r) => usedRealNames.add(r));
    const aliases = aliasHits.length > 0 ? aliasHits.join("|") : null;

    const existing = await prisma.examParameter.findUnique({ where: { canonicalName: entry.canonicalName } });
    if (existing) {
      await prisma.examParameter.update({ where: { id: existing.id }, data: { category: entry.category, aliases } });
      updated++;
    } else {
      await prisma.examParameter.create({ data: { canonicalName: entry.canonicalName, category: entry.category, aliases } });
      created++;
    }
  }

  // Nomes reais que não bateram com nenhuma entrada do catálogo de solicitação viram seu próprio
  // ExamParameter (categoria null — não temos de onde inferir uma sem adivinhar) — garante que
  // todo ExamResult já importado tenha, ao final, um parameterId resolvido.
  let realOnlyCreated = 0;
  for (const real of realNames) {
    if (usedRealNames.has(real)) continue;
    const existing = await prisma.examParameter.findUnique({ where: { canonicalName: real } });
    if (existing) continue;
    await prisma.examParameter.create({ data: { canonicalName: real, category: null, aliases: null } });
    realOnlyCreated++;
  }

  console.log("=== Importação do catálogo de parâmetros de exame concluída ===");
  console.log(`Catálogo (examsCatalog.ts): ${canonicalEntries.length} parâmetros canônicos (criados: ${created}, atualizados: ${updated})`);
  console.log(`Nomes reais distintos em ExamResult: ${realNames.length} (casados por alias: ${usedRealNames.size}, viraram parâmetro próprio: ${realOnlyCreated})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
