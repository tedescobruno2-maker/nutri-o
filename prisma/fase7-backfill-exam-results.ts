import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { matchExamParameter } from "../src/lib/examParameterMatch";
import { computeEffectiveFlag } from "../src/lib/examFlags";

/**
 * Roda depois de seed-exam-parameters.ts. Para cada ExamResult já existente: resolve
 * `parameterId` por alias, e recalcula `effectiveFlag`/`flagSource` pela precedência de
 * src/lib/examFlags.ts. Nenhum ClientExamReference existe ainda neste ponto (é criado pela
 * Luana depois, na tela), então na prática hoje isso reduz a "catálogo (se defaultMin/Max
 * estiver preenchido, o que hoje é sempre null) → laudo → indeterminado" — mas já deixa o dado
 * populado para quando ela começar a ajustar faixas por paciente.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  const catalog = await prisma.examParameter.findMany();
  const results = await prisma.examResult.findMany();

  let matched = 0;
  let unmatched = 0;
  const flagCounts: Record<string, number> = {};

  for (const result of results) {
    const param = matchExamParameter(result.parameterName, catalog);
    if (param) matched++;
    else unmatched++;

    const clientRef = param
      ? await prisma.clientExamReference.findUnique({
          where: { clientId_parameterId: { clientId: result.clientId, parameterId: param.id } },
        })
      : null;

    const { flag, source } = computeEffectiveFlag(result.value, {
      clientRefMin: clientRef?.refMin ?? null,
      clientRefMax: clientRef?.refMax ?? null,
      catalogDefaultMin: param?.defaultMin ?? null,
      catalogDefaultMax: param?.defaultMax ?? null,
      labReferenceMin: result.referenceMin,
      labReferenceMax: result.referenceMax,
    });
    flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;

    await prisma.examResult.update({
      where: { id: result.id },
      data: { parameterId: param?.id ?? null, effectiveFlag: flag, flagSource: source },
    });
  }

  console.log("=== Backfill de ExamResult concluído ===");
  console.log(`Total: ${results.length} — casados com o catálogo: ${matched}, sem catálogo (parameterId null): ${unmatched}`);
  console.log("Distribuição de effectiveFlag:", flagCounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
