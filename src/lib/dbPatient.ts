import "server-only";
import { prisma } from "@/lib/db";

/**
 * Único ponto de leitura do portal do paciente (Fase 8 constrói as telas; este wrapper já existe
 * desde a Fase 1 porque é o isolamento de segurança que a sessão do paciente depende).
 *
 * Regras que NÃO podem ser quebradas ao adicionar uma função aqui:
 * 1. O `clientId` vem sempre da SESSÃO (src/lib/session.ts → SessionUser.clientId), nunca de um
 *    argumento vindo de URL, formulário ou header não confiável.
 * 2. Toda busca por id inclui `clientId` no `where` — `findFirst({ where: { id, clientId } })`,
 *    nunca `findUnique({ where: { id } })` seguido de conferência manual.
 * 3. É allowlist: adicionar uma leitura ao portal é adicionar uma função aqui, deliberadamente.
 *    Nenhuma tela do portal fala com o Prisma diretamente.
 *
 * Alguns métodos previstos no plano mestre (ex.: getPrescriptions, via SupplementPrescription)
 * ainda não existem porque o modelo correspondente só é criado em fase futura (Fase 6) — serão
 * adicionados quando essas tabelas existirem.
 */
export function dbForPatient(clientId: string) {
  return {
    getClient: () =>
      prisma.client.findFirst({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          birthDate: true,
          age: true,
          height: true,
          goal: true,
          email: true,
          phone: true,
        },
      }),

    getActivePlan: () =>
      prisma.mealPlan.findFirst({
        where: { clientId, active: true },
        include: {
          meals: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
                include: { items: { orderBy: { order: "asc" }, include: { food: true, recipe: true } } },
              },
            },
          },
        },
      }),

    getPlanHistory: () =>
      prisma.mealPlan.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, objective: true, active: true, createdAt: true },
      }),

    getPlanById: (id: string) =>
      prisma.mealPlan.findFirst({
        where: { id, clientId },
        include: {
          meals: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
                include: { items: { orderBy: { order: "asc" }, include: { food: true, recipe: true } } },
              },
            },
          },
        },
      }),

    getMeasurements: () => prisma.measurement.findMany({ where: { clientId }, orderBy: { date: "asc" } }),

    getExamResults: () => prisma.examResult.findMany({ where: { clientId }, orderBy: { collectedAt: "asc" } }),

    getSupplements: () =>
      prisma.clientSupplement.findMany({ where: { clientId, active: true }, orderBy: { order: "asc" } }),

    getAppointments: () =>
      prisma.appointment.findMany({
        where: { clientId, scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      }),
  };
}
