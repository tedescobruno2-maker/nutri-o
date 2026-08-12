/**
 * Importa o backup gerado localmente (prisma/data-export.json — SQLite) para o
 * banco Postgres apontado por DATABASE_URL/DIRECT_URL (Supabase). Preserva os
 * IDs originais para manter todas as relações intactas.
 *
 * Pré-requisito: rodar `npx prisma db push` contra o Postgres antes, para criar
 * as tabelas.
 *
 * Rodar com: npx tsx prisma/import-to-postgres.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Converte strings ISO de data (produzidas pelo JSON.stringify) de volta para Date.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withDates(rows: any[], dateFields: string[]): any[] {
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of dateFields) {
      if (copy[field]) copy[field] = new Date(copy[field]);
    }
    return copy;
  });
}

async function main() {
  const inPath = path.join(process.cwd(), "prisma", "data-export.json");
  if (!fs.existsSync(inPath)) {
    throw new Error(`Arquivo não encontrado: ${inPath}. Rode a exportação primeiro.`);
  }
  const data = JSON.parse(fs.readFileSync(inPath, "utf8"));

  console.log("Limpando tabelas existentes no destino...");
  await prisma.client.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.food.deleteMany();
  await prisma.supplement.deleteMany();

  console.log("Importando...");

  await prisma.food.createMany({ data: data.foods });
  console.log(`  → ${data.foods.length} alimentos`);

  await prisma.recipe.createMany({ data: withDates(data.recipes, ["createdAt"]) });
  console.log(`  → ${data.recipes.length} receitas`);

  await prisma.recipeIngredient.createMany({ data: data.recipeIngredients });

  await prisma.client.createMany({ data: withDates(data.clients, ["createdAt", "updatedAt"]) });
  console.log(`  → ${data.clients.length} clientes`);

  await prisma.measurement.createMany({ data: withDates(data.measurements, ["date"]) });
  await prisma.dietLog.createMany({ data: withDates(data.dietLogs, ["weekStart"]) });

  await prisma.mealPlan.createMany({ data: withDates(data.mealPlans, ["createdAt", "updatedAt"]) });
  await prisma.meal.createMany({ data: data.meals });
  await prisma.mealOption.createMany({ data: data.mealOptions });
  await prisma.mealOptionItem.createMany({ data: data.mealOptionItems });
  console.log(`  → ${data.mealPlans.length} planos alimentares (${data.meals.length} refeições, ${data.mealOptions.length} opções, ${data.mealOptionItems.length} itens)`);

  await prisma.supplement.createMany({ data: data.supplements });
  await prisma.clientSupplement.createMany({ data: withDates(data.clientSupplements, ["createdAt"]) });
  console.log(`  → ${data.supplements.length} suplementos (${data.clientSupplements.length} vínculos com clientes)`);

  await prisma.consultationForm.createMany({
    data: withDates(data.consultationForms, ["sentAt", "completedAt", "birthDate", "createdAt"]),
  });
  console.log(`  → ${data.consultationForms.length} formulários de pré-consulta`);

  console.log("Importação para o Postgres concluída.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
