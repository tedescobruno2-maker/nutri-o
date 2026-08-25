import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Migração de dado da Fase 6 (não é uma migração de schema — roda depois do seed de suplementos).
 * Conforme 3.4 do plano mestre: "para cada paciente com suplementos ativos, criar uma
 * SupplementPrescription com status = FINALIZADA, date = min(createdAt dos itens), migrar cada
 * ClientSupplement para um SupplementPrescriptionItem com displayName = name,
 * posology = instructions. Não apagar ClientSupplement nesta fase — deixe como sombra até a
 * Fase 11, para permitir rollback."
 *
 * Idempotente: se o cliente já tem uma SupplementPrescription (criada por esta migração ou pela
 * nova tela), não cria outra — roda uma vez só por cliente.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clientsWithSupplements = await prisma.clientSupplement.findMany({
    select: { clientId: true },
    distinct: ["clientId"],
  });

  let prescriptionsCreated = 0;
  let clientsSkipped = 0;
  let itemsCreated = 0;

  for (const { clientId } of clientsWithSupplements) {
    const alreadyMigrated = await prisma.supplementPrescription.findFirst({ where: { clientId } });
    if (alreadyMigrated) {
      clientsSkipped++;
      continue;
    }

    const items = await prisma.clientSupplement.findMany({ where: { clientId }, orderBy: { order: "asc" } });
    if (items.length === 0) continue;

    const minCreatedAt = items.reduce((min, it) => (it.createdAt < min ? it.createdAt : min), items[0].createdAt);

    const prescription = await prisma.supplementPrescription.create({
      data: {
        clientId,
        date: minCreatedAt,
        version: 1,
        status: "FINALIZADA",
        generalNotes: "Migrado automaticamente dos registros de ClientSupplement anteriores à Fase 6.",
      },
    });
    prescriptionsCreated++;

    for (const item of items) {
      const section = /manipulad/i.test(item.name) || /manipulad/i.test(item.instructions) ? "MANIPULADO" : "LOJA_SUPLEMENTOS";
      await prisma.supplementPrescriptionItem.create({
        data: {
          prescriptionId: prescription.id,
          section,
          supplementId: item.supplementId,
          displayName: item.name,
          posology: item.instructions,
          active: item.active,
          discontinuedAt: item.discontinuedAt,
          order: item.order,
        },
      });
      itemsCreated++;
    }
  }

  const clientSupplementCountAfter = await prisma.clientSupplement.count();

  console.log("=== Migração de ClientSupplement → SupplementPrescription concluída ===");
  console.log(`Clientes com suplementos: ${clientsWithSupplements.length}`);
  console.log(`Prescrições criadas: ${prescriptionsCreated} (clientes já migrados/ignorados: ${clientsSkipped})`);
  console.log(`Itens de prescrição criados: ${itemsCreated}`);
  console.log(`ClientSupplement ainda no banco (não apagados): ${clientSupplementCountAfter}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
