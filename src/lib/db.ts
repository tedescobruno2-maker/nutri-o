import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase exige TLS; o pacote `pg` não negocia SSL automaticamente a partir da
// connection string sozinho em todos os casos, então habilitamos explicitamente.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

const TWENTY_YEARS_MS = 20 * 365.25 * 24 * 60 * 60 * 1000;

/**
 * Fase 11 (B8, Res. CFN 594/2017 Art. 3º, VI): bloqueio de exclusão FÍSICA do prontuário por 20
 * anos, a contar de `Client.lastRecordAt`. Isto não é só "não chamamos delete em lugar nenhum" —
 * é um bloqueio no próprio cliente Prisma, então mesmo um `client.delete(...)` futuro escrito por
 * engano é rejeitado aqui, não só pela convenção do código de aplicação (`actions/clients.ts` usa
 * exclusivamente `deletedAt`/`deletedReason`, nunca isto).
 */
async function assertPastRetentionWindow(clientId: string | undefined) {
  if (!clientId) {
    throw new Error("Exclusão física de Client bloqueada — filtro sem id direto não permite conferir os 20 anos de guarda (Res. CFN 594/2017, Art. 3º, VI).");
  }
  const client = await basePrisma.client.findUnique({ where: { id: clientId }, select: { lastRecordAt: true, createdAt: true } });
  if (!client) return; // já não existe — nada a bloquear
  const since = client.lastRecordAt ?? client.createdAt;
  if (Date.now() - since.getTime() < TWENTY_YEARS_MS) {
    throw new Error(
      `Exclusão física de Client bloqueada — prontuário precisa ser mantido por 20 anos a partir do último registro clínico (Res. CFN 594/2017, Art. 3º, VI). Use deleteClient() (exclusão lógica via deletedAt) em vez disto. clientId=${clientId}`
    );
  }
}

export const prisma = basePrisma.$extends({
  name: "bloqueia-exclusao-fisica-prontuario",
  query: {
    client: {
      async delete({ args, query }) {
        const id = typeof args.where.id === "string" ? args.where.id : undefined;
        await assertPastRetentionWindow(id);
        return query(args);
      },
      async deleteMany() {
        throw new Error("Exclusão física em massa de Client bloqueada — prontuário deve ser mantido por 20 anos (Res. CFN 594/2017, Art. 3º, VI). Use deleteClient() (exclusão lógica via deletedAt).");
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
