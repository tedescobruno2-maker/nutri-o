/**
 * Exporta TODAS as tabelas do banco atual para um JSON de backup, espelhando o
 * padrão de prisma/import-to-postgres.ts (mesmo projeto, sentido inverso).
 * Usado como rede de segurança antes de qualquer migração de schema.
 *
 * Rodar com: npx tsx prisma/export-full-backup.ts <caminho-de-saida.json>
 * Ex.:       npx tsx prisma/export-full-backup.ts prisma/data-export-fase0.json
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const outArg = process.argv[2] ?? "prisma/data-export-backup.json";
  const outPath = path.join(process.cwd(), outArg);

  console.log("Exportando todas as tabelas...");

  const [
    clients,
    consultations,
    exams,
    examResults,
    appointments,
    measurements,
    dietLogs,
    foods,
    recipes,
    recipeIngredients,
    mealPlans,
    meals,
    mealOptions,
    mealOptionItems,
    supplements,
    clientSupplements,
    consultationForms,
    professionalSettings,
    guidanceTexts,
  ] = await Promise.all([
    prisma.client.findMany(),
    prisma.consultation.findMany(),
    prisma.exam.findMany(),
    prisma.examResult.findMany(),
    prisma.appointment.findMany(),
    prisma.measurement.findMany(),
    prisma.dietLog.findMany(),
    prisma.food.findMany(),
    prisma.recipe.findMany(),
    prisma.recipeIngredient.findMany(),
    prisma.mealPlan.findMany(),
    prisma.meal.findMany(),
    prisma.mealOption.findMany(),
    prisma.mealOptionItem.findMany(),
    prisma.supplement.findMany(),
    prisma.clientSupplement.findMany(),
    prisma.consultationForm.findMany(),
    prisma.professionalSettings.findMany(),
    prisma.guidanceText.findMany(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    clients,
    consultations,
    exams,
    examResults,
    appointments,
    measurements,
    dietLogs,
    foods,
    recipes,
    recipeIngredients,
    mealPlans,
    meals,
    mealOptions,
    mealOptionItems,
    supplements,
    clientSupplements,
    consultationForms,
    professionalSettings,
    guidanceTexts,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

  const counts = Object.fromEntries(
    Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length])
  );
  console.log("Contagens exportadas:", counts);
  console.log(`\n✓ Backup salvo em: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
