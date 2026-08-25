import "dotenv/config";
import path from "node:path";
import XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { FoodPreparation } from "../src/generated/prisma/enums";
import type { Prisma } from "../src/generated/prisma/client";

// Importador da TACO 4ª ed. (NEPA/Unicamp, 2011, 597 alimentos) — Fase 2 do plano mestre.
// Fonte primária (D4): "É permitida a reprodução total ou parcial do material, desde que seja
// citada a fonte." Arquivo versionado em prisma/seed-data/taco-4ed.xlsx (nunca hotlink).
// Idempotente: upsert por [baseName, preparation, brand].
// Regra dura: valores "NA", "Tr", "*" ou vazios da TACO viram null, NUNCA zero.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const XLSX_PATH = path.join(__dirname, "seed-data", "taco-4ed.xlsx");
const SHEET_NAME = "CMVCol taco3";

// Colunas da planilha oficial (ver cabeçalho de 3 linhas mescladas nas linhas 0-2 do sheet).
const COL = {
  code: 0,
  name: 1,
  kcal: 3,
  protein: 5,
  fat: 6,
  carbs: 8,
  fiber: 9,
  sodium: 17,
};

// Dicionário de preparo (5.2.1). Bate contra o último segmento (após a última vírgula) do nome.
const PREPARATION_WORDS: Record<string, FoodPreparation> = {
  cru: "CRU",
  crua: "CRU",
  cozido: "COZIDO",
  cozida: "COZIDO",
  assado: "ASSADO",
  assada: "ASSADO",
  grelhado: "GRELHADO",
  grelhada: "GRELHADO",
  frito: "FRITO",
  frita: "FRITO",
  refogado: "REFOGADO",
  refogada: "REFOGADO",
  mexido: "MEXIDO",
  mexida: "MEXIDO",
  desidratado: "DESIDRATADO",
  desidratada: "DESIDRATADO",
  "po": "EM_PO", // TACO grava só ", pó" no fim do nome, não "em pó"
  "em po": "EM_PO",
  "pure": "PURE",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeToken(s: string): string {
  return stripAccents(s).toLowerCase().trim();
}

type ParsedName = { baseName: string; preparation: FoodPreparation; suspicious: boolean };

function parseTacoName(fullName: string): ParsedName {
  const parts = fullName.split(",").map((p) => p.trim());
  const last = parts[parts.length - 1];
  const lastNorm = normalizeToken(last);

  // Match exato do último segmento inteiro contra o dicionário.
  if (PREPARATION_WORDS[lastNorm]) {
    return {
      baseName: parts.slice(0, -1).join(", "),
      preparation: PREPARATION_WORDS[lastNorm],
      suspicious: false,
    };
  }

  // Variante "<preparo>/detalhe" observada na TACO real (ex.: "cozido/10minutos").
  const slashMatch = lastNorm.match(/^([a-z]+)\s*\/\s*.+$/);
  if (slashMatch && PREPARATION_WORDS[slashMatch[1]]) {
    return {
      baseName: parts.slice(0, -1).join(", "),
      preparation: PREPARATION_WORDS[slashMatch[1]],
      suspicious: false,
    };
  }

  // Não bateu — não força. Mas relata se uma palavra de preparo aparece em posição inesperada.
  const suspicious = Object.keys(PREPARATION_WORDS).some((word) => {
    const re = new RegExp(`\\b${word}\\b`);
    return re.test(lastNorm);
  });

  return { baseName: fullName, preparation: "NAO_APLICA", suspicious };
}

/** "NA", "Tr", "*", "" e vazio viram null — nunca 0. Números passam direto. */
function cleanNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Aba "${SHEET_NAME}" não encontrada em ${XLSX_PATH}`);

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  let currentCategory: string | null = null;
  const parsedRows: Array<{
    code: number;
    name: string;
    category: string | null;
    baseName: string;
    preparation: FoodPreparation;
    suspicious: boolean;
    kcal: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    fiber: number | null;
    sodium: number | null;
  }> = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    const col0 = r[COL.code];
    const col1 = r[COL.name];

    // Linha de categoria: primeira coluna é texto, e as duas seguintes estão vazias.
    if (typeof col0 === "string" && col1 == null && r[2] == null) {
      currentCategory = col0;
      continue;
    }

    // Linha de alimento: primeira coluna é o número TACO, segunda é o nome.
    if (typeof col0 === "number" && typeof col1 === "string") {
      const { baseName, preparation, suspicious } = parseTacoName(col1);
      parsedRows.push({
        code: col0,
        name: col1,
        category: currentCategory,
        baseName,
        preparation,
        suspicious,
        kcal: cleanNumber(r[COL.kcal]),
        protein: cleanNumber(r[COL.protein]),
        fat: cleanNumber(r[COL.fat]),
        carbs: cleanNumber(r[COL.carbs]),
        fiber: cleanNumber(r[COL.fiber]),
        sodium: cleanNumber(r[COL.sodium]),
      });
    }
    // outras linhas (cabeçalhos repetidos, notas de rodapé, linhas em branco) são ignoradas.
  }

  // Agrupa por baseName na ordem de aparição — o primeiro de cada grupo é o "pai" (5.2.1 regra 4).
  const groups = new Map<string, typeof parsedRows>();
  for (const row of parsedRows) {
    const list = groups.get(row.baseName) ?? [];
    list.push(row);
    groups.set(row.baseName, list);
  }

  let created = 0;
  let updated = 0;
  const suspiciousNames: string[] = [];

  for (const [, group] of groups) {
    let parentId: string | null = null;

    for (let idx = 0; idx < group.length; idx++) {
      const row = group[idx];
      if (row.suspicious) suspiciousNames.push(row.name);

      // findFirst (não findUnique): o índice composto tem `brand` opcional, e o Prisma não aceita
      // null como parte de uma busca por chave única composta (semântica de NULL do Postgres).
      const existing = await prisma.food.findFirst({
        where: { baseName: row.baseName, preparation: row.preparation, brand: null },
      });

      // kcal ausente é o critério de corte: sem energia, o item não pode entrar no somatório
      // calórico do plano — fica PENDENTE mesmo vindo da TACO (6 alimentos da tabela real não têm
      // energia medida, ex.: "Sal, grosso").
      const data: Prisma.FoodUncheckedCreateInput = {
        name: row.name,
        baseName: row.baseName,
        preparation: row.preparation,
        category: row.category,
        kcal100: row.kcal,
        protein100: row.protein,
        carbs100: row.carbs,
        fat100: row.fat,
        fiber100: row.fiber,
        sodium100: row.sodium,
        source: "TACO",
        sourceRef: `TACO-${row.code}`,
        nutrientStatus: row.kcal !== null ? "VALIDADO" : "PENDENTE",
        parentFoodId: idx === 0 ? null : parentId,
      };

      if (existing) {
        await prisma.food.update({ where: { id: existing.id }, data });
        if (idx === 0) parentId = existing.id;
        updated++;
      } else {
        const createdRow = await prisma.food.create({ data });
        if (idx === 0) parentId = createdRow.id;
        created++;
      }
    }
  }

  const pendentes = parsedRows.filter((r) => r.kcal === null).length;
  console.log("=== Importação TACO 4ª ed. concluída ===");
  console.log(`Linhas de alimento lidas: ${parsedRows.length}`);
  console.log(`Criados: ${created} | Atualizados: ${updated} | Ignorados: 0`);
  console.log(`Grupos (baseName distintos): ${groups.size}`);
  console.log(`Sem energia medida (nutrientStatus = PENDENTE): ${pendentes}`);
  if (suspiciousNames.length) {
    console.log(`\nNomes com possível palavra de preparo não reconhecida na posição esperada (${suspiciousNames.length}):`);
    for (const n of suspiciousNames) console.log(`  - ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
