import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SupplementOrigin } from "../src/generated/prisma/enums";

/**
 * Seed do banco de suplementos por PRINCÍPIO ATIVO + MARCAS (D7 / 3.4 / 5.6.4 do plano mestre).
 * Fonte: prisma/seed-data/suplementos-base-sanitized.json — cópia de
 * _PLANO-MESTRE/seed/suplementos-base.json com o campo `arquivos_de_origem` removido (continha
 * nome de paciente nos nomes dos PDFs de origem — não pode ser commitado).
 *
 * Regra dura da fonte: nenhum valor de composição, dose por cápsula ou tabela nutricional foi
 * estimado. Campo `null` no JSON entra `null` no banco — nunca vira zero nem é inferido.
 *
 * Idempotente: upsert por `activeName` (Supplement) e por `name` (SupplementBrand,
 * CompoundedFormula).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const DATA_PATH = path.join(__dirname, "seed-data", "suplementos-base-sanitized.json");

type Ativo = {
  nome_ativo: string;
  categoria: string | null;
  origem: string;
  formas_apresentacao_citadas: string[];
  dosagens_observadas: string[];
  horarios_observados: string[];
  marcas_citadas: string[];
  observacoes_literais: string | null;
  composicao_por_dose: unknown;
  unidade_medida_padrao: unknown;
  imagem_url: string | null;
  registro_anvisa: string | null;
};

type Formula = {
  nome: string;
  apresentacao: string | null;
  posologia: string | null;
  composicao: Array<{ ativo: string; quantidade: string }>;
};

type CitadoNoPlano = {
  nome_ativo: string;
  categoria: string | null;
  observacao_literal: string | null;
};

type SeedFile = {
  marcas: string[];
  ativos: Ativo[];
  formulas_manipuladas: Formula[];
  citados_apenas_nos_planos_alimentares: CitadoNoPlano[];
};

function mapOrigin(origem: string): SupplementOrigin {
  const v = origem.trim().toLowerCase();
  if (v === "manipulado") return "MANIPULADO";
  if (v === "ambos") return "AMBOS";
  return "LOJA_SUPLEMENTOS";
}

function joinOrNull(items: string[]): string | null {
  const filtered = items.filter(Boolean);
  return filtered.length > 0 ? filtered.join("; ") : null;
}

async function main() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const data: SeedFile = JSON.parse(raw);

  let brandsCreated = 0;
  let brandsUpdated = 0;
  for (const name of data.marcas) {
    const existing = await prisma.supplementBrand.findUnique({ where: { name } });
    if (existing) brandsUpdated++;
    else {
      await prisma.supplementBrand.create({ data: { name } });
      brandsCreated++;
    }
  }

  const activeNames = new Set<string>();
  let activesCreated = 0;
  let activesUpdated = 0;

  for (const ativo of data.ativos) {
    activeNames.add(ativo.nome_ativo);
    const supplementData = {
      category: ativo.categoria,
      origin: mapOrigin(ativo.origem),
      defaultDose: joinOrNull(ativo.dosagens_observadas),
      defaultTiming: joinOrNull(ativo.horarios_observados),
      notes: ativo.observacoes_literais,
      imageUrl: ativo.imagem_url,
      active: true,
    };
    const existing = await prisma.supplement.findUnique({ where: { activeName: ativo.nome_ativo } });
    if (existing) {
      await prisma.supplement.update({ where: { id: existing.id }, data: supplementData });
      activesUpdated++;
    } else {
      await prisma.supplement.create({ data: { activeName: ativo.nome_ativo, ...supplementData } });
      activesCreated++;
    }
  }

  // Suplementos citados só em planos alimentares (Supercoffee, Palatinose, sachê de carboidrato) —
  // não fazem parte das 10 prescrições reais, mas o plano mestre pede que entrem no catálogo (7.2).
  let citadosCreated = 0;
  let citadosUpdated = 0;
  for (const c of data.citados_apenas_nos_planos_alimentares) {
    activeNames.add(c.nome_ativo);
    const supplementData = {
      category: c.categoria,
      origin: "LOJA_SUPLEMENTOS" as SupplementOrigin,
      notes: c.observacao_literal,
      active: true,
    };
    const existing = await prisma.supplement.findUnique({ where: { activeName: c.nome_ativo } });
    if (existing) {
      await prisma.supplement.update({ where: { id: existing.id }, data: supplementData });
      citadosUpdated++;
    } else {
      await prisma.supplement.create({ data: { activeName: c.nome_ativo, ...supplementData } });
      citadosCreated++;
    }
  }

  // Arquiva (active=false) os Supplement pré-existentes (fase pré-6, criados como sombra de
  // ClientSupplement — string composta livre, ex.: "Creatina (True Source, Vitafor, Nutrify) 5g")
  // que não coincidem com nenhum dos ativos curados acima. Identificados pela relação com
  // ClientSupplement (só essas linhas antigas têm essa referência) para nunca arquivar, por engano,
  // um "ativo" de categoria criado depois pelo seed do catálogo Essentia. Preservados (nunca
  // apagados — ainda são referenciados por ClientSupplement.supplementId), só saem da grade
  // "Ativos" (5.6.1).
  const archived = await prisma.supplement.updateMany({
    where: {
      activeName: { notIn: Array.from(activeNames) },
      active: true,
      clientSupplements: { some: {} },
    },
    data: { active: false },
  });

  let formulasCreated = 0;
  let formulasUpdated = 0;
  let formulaItemsCreated = 0;
  let formulaItemsUpdated = 0;

  for (const formula of data.formulas_manipuladas) {
    const formulaData = { presentation: formula.apresentacao, posology: formula.posologia };
    const existing = await prisma.compoundedFormula.findFirst({ where: { name: formula.nome } });
    const formulaRecord = existing
      ? await prisma.compoundedFormula.update({ where: { id: existing.id }, data: formulaData })
      : await prisma.compoundedFormula.create({ data: { name: formula.nome, ...formulaData } });
    if (existing) formulasUpdated++;
    else formulasCreated++;

    for (let i = 0; i < formula.composicao.length; i++) {
      const item = formula.composicao[i];
      const matchedSupplement = await prisma.supplement.findFirst({
        where: { activeName: { equals: item.ativo, mode: "insensitive" } },
      });
      const itemData = {
        supplementId: matchedSupplement?.id ?? null,
        activeName: item.ativo,
        quantity: item.quantidade,
        order: i,
      };
      const existingItem = await prisma.compoundedFormulaItem.findFirst({
        where: { formulaId: formulaRecord.id, activeName: item.ativo },
      });
      if (existingItem) {
        await prisma.compoundedFormulaItem.update({ where: { id: existingItem.id }, data: itemData });
        formulaItemsUpdated++;
      } else {
        await prisma.compoundedFormulaItem.create({ data: { formulaId: formulaRecord.id, ...itemData } });
        formulaItemsCreated++;
      }
    }
  }

  console.log("=== Importação de suplementos concluída ===");
  console.log(`Marcas: ${data.marcas.length} (criadas: ${brandsCreated}, já existentes: ${brandsUpdated})`);
  console.log(`Ativos curados: ${data.ativos.length} (criados: ${activesCreated}, atualizados: ${activesUpdated})`);
  console.log(`Citados só em planos: ${data.citados_apenas_nos_planos_alimentares.length} (criados: ${citadosCreated}, atualizados: ${citadosUpdated})`);
  console.log(`Suplementos legados (pré-Fase 6) arquivados (active=false): ${archived.count}`);
  console.log(`Fórmulas manipuladas: ${data.formulas_manipuladas.length} (criadas: ${formulasCreated}, atualizadas: ${formulasUpdated})`);
  console.log(`Itens de fórmula: criados ${formulaItemsCreated}, atualizados ${formulaItemsUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
