import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "../src/generated/prisma/client";

/**
 * Seed dos 32 produtos do catálogo Essentia (7.3 do plano mestre). Fonte:
 * prisma/seed-data/essentia-catalog.json — cópia integral de
 * _PLANO-MESTRE/seed/essentia-catalog.json (sem dado de paciente; é um catálogo de produto).
 *
 * Regra dura: nenhuma página traz tabela nutricional completa (26 dos 32) — nesses casos
 * `nutritionJson` entra `null`, nunca inventado. `imageUrl` fica `null` para todos: as fotos do
 * catálogo são material de marca (5.6.5) e só podem entrar com autorização do fabricante, que
 * ainda não existe.
 *
 * `SupplementProduct.supplementId` é obrigatório no schema (D7 — todo produto pertence a um
 * "ativo"). Os produtos deste catálogo raramente casam 1:1 com um dos 27 ativos curados de
 * seed-suplementos.ts (muitos são blends, ex. "colágeno + creatina + BCAA") — forçar esse link
 * inventaria uma composição que a fonte não afirma. Em vez disso, cada produto é ligado a um
 * "ativo" derivado da própria `categoria` do catálogo (upsert por activeName) — preserva o texto
 * da fonte sem fabricar uma equivalência clínica que ela não sustenta. Decisão registrada no
 * relatório de fase (não estava especificada em 3.4/5.6).
 *
 * Todos os 32 produtos entram sob a marca "ESSENTIAL / ESSENTIA" (um dos 9 marcas de
 * suplementos-base.json), conforme o critério de conclusão da Fase 6. Três produtos têm marca
 * impressa diferente no catálogo (Mondz, Noorskin) ou não capturada — preservada em `sourceRef`
 * para não perder a informação original.
 *
 * Idempotente: upsert por [brandId, commercialName] (SupplementProduct) e por activeName
 * (Supplement de categoria).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const DATA_PATH = path.join(__dirname, "seed-data", "essentia-catalog.json");
const BRAND_NAME = "ESSENTIAL / ESSENTIA";

type Produto = {
  nome_comercial: string;
  marca: string | null;
  categoria: string;
  principio_ativo_ou_composicao: string | null;
  apresentacao: string | null;
  dose_rotulo: string | null;
  sabores: string[] | null;
  tabela_nutricional: Record<string, string> | null;
  pagina: number;
  observacoes: string | null;
};

type CatalogFile = {
  fonte: string;
  produtos: Produto[];
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function main() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const data: CatalogFile = JSON.parse(raw);

  const brand = await prisma.supplementBrand.upsert({
    where: { name: BRAND_NAME },
    update: {},
    create: { name: BRAND_NAME },
  });

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let withNutritionTable = 0;

  for (const produto of data.produtos) {
    const activeName = capitalize(produto.categoria);
    const existingCategory = await prisma.supplement.findUnique({ where: { activeName } });
    const categorySupplement = existingCategory
      ? existingCategory
      : await prisma.supplement.create({
          data: {
            activeName,
            category: produto.categoria,
            origin: "LOJA_SUPLEMENTOS",
            notes: "Agrupamento por categoria do catálogo Essentia (produto de marca) — não é um princípio ativo único curado a partir de prescrição real. Ver os produtos vinculados para a composição impressa no rótulo.",
            active: true,
          },
        });
    if (existingCategory) categoriesUpdated++;
    else categoriesCreated++;

    const sourceRef =
      produto.marca && produto.marca !== "Essential Nutrition"
        ? `ESSENTIA GROUP.pdf, p. ${produto.pagina} (marca impressa: ${produto.marca})`
        : `ESSENTIA GROUP.pdf, p. ${produto.pagina}`;

    if (produto.tabela_nutricional) withNutritionTable++;

    const productData = {
      supplementId: categorySupplement.id,
      presentation: produto.apresentacao,
      flavors: produto.sabores ? produto.sabores.join(", ") : null,
      doseLabel: produto.dose_rotulo,
      nutritionJson: (produto.tabela_nutricional ?? null) as Prisma.InputJsonValue | undefined,
      anvisaRef: null,
      imageUrl: null,
      imageCredit: null,
      imageLicense: null,
      sourceRef,
      active: true,
    };

    const existingProduct = await prisma.supplementProduct.findUnique({
      where: { brandId_commercialName: { brandId: brand.id, commercialName: produto.nome_comercial } },
    });
    if (existingProduct) {
      await prisma.supplementProduct.update({ where: { id: existingProduct.id }, data: productData });
      productsUpdated++;
    } else {
      await prisma.supplementProduct.create({ data: { brandId: brand.id, commercialName: produto.nome_comercial, ...productData } });
      productsCreated++;
    }
  }

  console.log("=== Importação do catálogo Essentia concluída ===");
  console.log(`Marca: ${BRAND_NAME}`);
  console.log(`Produtos: ${data.produtos.length} (criados: ${productsCreated}, atualizados: ${productsUpdated})`);
  console.log(`Com tabela nutricional impressa: ${withNutritionTable} (esperado: 6) — sem tabela (null): ${data.produtos.length - withNutritionTable} (esperado: 26)`);
  console.log(`Ativos de categoria derivados do catálogo: ${categoriesCreated} criados, ${categoriesUpdated} já existentes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
