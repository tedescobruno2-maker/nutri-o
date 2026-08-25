import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Migração de dado da Fase 10 (biblioteca de imagens retroativa — 5.11/3.8). Para cada registro
 * de Food/Recipe/Supplement/SupplementProduct que já tem `imageUrl` preenchida mas nenhum
 * `imageAssetId`, cria um ImageAsset com `source = OUTRA` e `license = "origem não registrada —
 * anterior à biblioteca de imagens"`, e aponta `imageAssetId` para ele. Nunca apaga `imageUrl` —
 * fica como sombra até a Fase 11 (regra explícita do plano mestre).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const LEGACY_LICENSE = "origem não registrada — anterior à biblioteca de imagens";

async function main() {
  let created = 0;

  const foods = await prisma.food.findMany({ where: { imageUrl: { not: null }, imageAssetId: null } });
  for (const food of foods) {
    const asset = await prisma.imageAsset.create({
      data: { url: food.imageUrl!, source: "OUTRA", license: LEGACY_LICENSE, altText: food.name },
    });
    await prisma.food.update({ where: { id: food.id }, data: { imageAssetId: asset.id } });
    created++;
  }

  const recipes = await prisma.recipe.findMany({ where: { imageUrl: { not: null }, imageAssetId: null } });
  for (const recipe of recipes) {
    const asset = await prisma.imageAsset.create({
      data: { url: recipe.imageUrl!, source: "OUTRA", license: LEGACY_LICENSE, altText: recipe.name },
    });
    await prisma.recipe.update({ where: { id: recipe.id }, data: { imageAssetId: asset.id } });
    created++;
  }

  const supplements = await prisma.supplement.findMany({ where: { imageUrl: { not: null }, imageAssetId: null } });
  for (const supplement of supplements) {
    const asset = await prisma.imageAsset.create({
      data: { url: supplement.imageUrl!, source: "OUTRA", license: LEGACY_LICENSE, altText: supplement.activeName },
    });
    await prisma.supplement.update({ where: { id: supplement.id }, data: { imageAssetId: asset.id } });
    created++;
  }

  const products = await prisma.supplementProduct.findMany({ where: { imageUrl: { not: null }, imageAssetId: null } });
  for (const product of products) {
    const asset = await prisma.imageAsset.create({
      data: { url: product.imageUrl!, source: "OUTRA", license: product.imageLicense ?? LEGACY_LICENSE, altText: product.commercialName },
    });
    await prisma.supplementProduct.update({ where: { id: product.id }, data: { imageAssetId: asset.id } });
    created++;
  }

  console.log("=== Migração de imagens legadas concluída ===");
  console.log(`Food: ${foods.length}, Recipe: ${recipes.length}, Supplement: ${supplements.length}, SupplementProduct: ${products.length}`);
  console.log(`Total de ImageAsset criados: ${created}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
