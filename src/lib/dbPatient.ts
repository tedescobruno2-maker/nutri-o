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
 * 4. O que o paciente NUNCA vê (5.8.3) nunca é selecionado aqui: Client.notes, Consultation.notes,
 *    SupplementPrescriptionItem.justification, ClientExamReference.reason, AuditLog, qualquer
 *    registro de outro paciente.
 */

const PLAN_INCLUDE = {
  meals: {
    orderBy: { order: "asc" as const },
    include: {
      options: {
        orderBy: { order: "asc" as const },
        include: {
          items: {
            orderBy: { order: "asc" as const },
            include: {
              food: true,
              foodMeasure: true,
              recipe: { include: { ingredientItems: { orderBy: { order: "asc" as const }, include: { food: true } } } },
              choiceGroup: { include: { items: { orderBy: { order: "asc" as const }, include: { food: true } } } },
            },
          },
        },
      },
    },
  },
};

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
          document: true,
          profession: true,
          allergies: true,
          intolerances: true,
          dietaryRestrictions: true,
          foodAversions: true,
        },
      }),

    getActivePlan: () =>
      prisma.mealPlan.findFirst({
        where: { clientId, active: true },
        include: { consultation: true, initialGuidance: true, ...PLAN_INCLUDE },
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
        include: { consultation: true, initialGuidance: true, ...PLAN_INCLUDE },
      }),

    getMeasurements: () => prisma.measurement.findMany({ where: { clientId }, orderBy: { date: "asc" } }),

    /** Medida de peso mais próxima da data informada — nunca inventa peso (mesma regra de
     * dal.ts:getNearestMeasurement, reimplementada aqui porque o portal não importa de dal.ts). */
    getNearestMeasurement: async (date: Date) => {
      const measurements = await prisma.measurement.findMany({ where: { clientId }, orderBy: { date: "asc" } });
      if (measurements.length === 0) return null;
      return measurements.reduce((closest, m) => (Math.abs(m.date.getTime() - date.getTime()) < Math.abs(closest.date.getTime() - date.getTime()) ? m : closest));
    },

    getDietLogs: () => prisma.dietLog.findMany({ where: { clientId }, orderBy: { weekStart: "asc" } }),

    /** Mesmo agrupamento por parâmetro + flag efetiva de dal.ts:getExamResultsGrouped, mas
     * recalculado aqui dentro (não importa de src/lib/dal.ts — o portal não fala com funções
     * escritas para a tela profissional, mesmo que o clientId venha da sessão de qualquer forma). */
    getExamResultsGrouped: async () => {
      const results = await prisma.examResult.findMany({ where: { clientId }, orderBy: { collectedAt: "asc" }, include: { parameter: true } });
      const byParameter = new Map<string, typeof results>();
      for (const r of results) {
        const list = byParameter.get(r.parameterName) ?? [];
        list.push(r);
        byParameter.set(r.parameterName, list);
      }
      return [...byParameter.entries()]
        .map(([parameterName, points]) => {
          const latest = points.at(-1)!;
          return {
            parameterName,
            unit: latest.unit,
            referenceText: latest.referenceText,
            referenceMin: latest.referenceMin,
            referenceMax: latest.referenceMax,
            latest,
            flag: latest.effectiveFlag ?? latest.flag,
            points,
          };
        })
        .sort((a, b) => a.parameterName.localeCompare(b.parameterName, "pt-BR"));
    },

    /** Prescrições finalizadas (5.1.2) — justification nunca é selecionado (5.8.3). */
    getPrescriptions: () =>
      prisma.supplementPrescription.findMany({
        where: { clientId, status: "FINALIZADA" },
        orderBy: { version: "desc" },
        include: {
          items: {
            where: { active: true },
            orderBy: { order: "asc" },
            select: {
              id: true,
              section: true,
              displayName: true,
              acceptedBrands: true,
              composition: true,
              route: true,
              posology: true,
              active: true,
            },
          },
        },
      }),

    getPrescriptionById: (id: string) =>
      prisma.supplementPrescription.findFirst({
        where: { id, clientId, status: "FINALIZADA" },
        include: {
          items: {
            where: { active: true },
            orderBy: { order: "asc" },
            select: {
              id: true,
              section: true,
              displayName: true,
              acceptedBrands: true,
              composition: true,
              route: true,
              posology: true,
              active: true,
            },
          },
        },
      }),

    getAppointments: () =>
      prisma.appointment.findMany({
        where: { clientId, scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      }),

    getLastConsultationDate: async () => {
      const consultation = await prisma.consultation.findFirst({ where: { clientId }, orderBy: { date: "desc" }, select: { date: true } });
      return consultation?.date ?? null;
    },
  };
}
