import "server-only";
import { prisma } from "@/lib/db";
import { KANBAN_STATUSES, type KanbanStatusValue } from "@/lib/utils";

export async function getKanbanBoard() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { order: "asc" }],
  });

  const board = new Map<KanbanStatusValue, typeof clients>();
  for (const status of KANBAN_STATUSES) board.set(status, []);
  for (const client of clients) {
    board.get(client.status as KanbanStatusValue)?.push(client);
  }
  return board;
}

export async function getClients() {
  return prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { measurements: true } },
      measurements: { orderBy: { date: "desc" }, take: 1 },
      consultations: { orderBy: { date: "desc" }, take: 1 },
    },
  });
}

export async function getClientProfile(id: string) {
  const [client, mealPlanHistory] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        measurements: { orderBy: { date: "asc" } },
        dietLogs: { orderBy: { weekStart: "asc" } },
        supplements: { orderBy: [{ active: "desc" }, { order: "asc" }] },
        supplementPrescriptions: {
          orderBy: { version: "desc" },
          include: { items: { orderBy: { order: "asc" }, include: { supplement: true, formula: true } } },
        },
        consultationForms: { orderBy: { createdAt: "desc" }, take: 1 },
        consultations: { orderBy: { date: "desc" } },
        exams: { orderBy: { requestedDate: "desc" } },
        mealPlans: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            consultation: true,
            initialGuidance: true,
            meals: {
              orderBy: { order: "asc" },
              include: {
                options: {
                  orderBy: { order: "asc" },
                  include: {
                    imageAsset: true,
                    items: {
                      orderBy: { order: "asc" },
                      include: {
                        food: true,
                        foodMeasure: true,
                        recipe: { include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } } } },
                        choiceGroup: { include: { items: { orderBy: { order: "asc" }, include: { food: true } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.mealPlan.findMany({
      where: { clientId: id, active: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        objective: true,
        createdAt: true,
        _count: { select: { meals: true } },
      },
    }),
  ]);

  return client ? { ...client, mealPlanHistory } : null;
}

/** Árvore completa de um plano por id — usada por duplicar/finalizar/salvar como modelo, que
 * operam sobre um `mealPlanId` arbitrário, não necessariamente o plano ativo do paciente. */
export async function getMealPlanFullTree(mealPlanId: string) {
  return prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
    include: {
      meals: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
            include: {
              items: {
                orderBy: { order: "asc" },
                include: {
                  food: true,
                  foodMeasure: true,
                  recipe: { include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } } } },
                  choiceGroup: { include: { items: { orderBy: { order: "asc" }, include: { food: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getMealPlanTemplates() {
  return prisma.mealPlanTemplate.findMany({ orderBy: { name: "asc" } });
}

export async function getChoiceGroupsForBuilder() {
  return prisma.choiceGroup.findMany({
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" }, include: { food: true } } },
  });
}

export async function getRecipes() {
  return prisma.recipe.findMany({ orderBy: { createdAt: "desc" }, include: { imageAsset: true } });
}

export async function getRecipesWithIngredients() {
  return prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } }, imageAsset: true },
  });
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } }, imageAsset: true },
  });
}

/** Alimentos para o construtor de plano (Fase 4) — inclui as medidas caseiras cadastradas, para o
 * seletor "1 unidade" × multiplicador em vez de forçar tudo em grama (5.4.3). */
export async function getFoodsForBuilder() {
  return prisma.food.findMany({
    where: { active: true },
    orderBy: { baseName: "asc" },
    include: { measures: { orderBy: { isDefault: "desc" } } },
  });
}

export async function getFoods(search?: string) {
  return prisma.food.findMany({
    where: search
      ? { name: { contains: search } }
      : undefined,
    orderBy: { name: "asc" },
  });
}

/**
 * Tela `/alimentos` (Fase 2): agrupa por `baseName` — cada grupo é um alimento-base com seus
 * preparos como variantes (ex.: "Ovo de galinha, inteiro" agrupa cru/cozido/frito). O agrupamento
 * é feito aqui, não por `parentFoodId`, porque a busca precisa achar o grupo mesmo quando o termo
 * só bate no nome de uma variante (ex.: buscar "frito" acha o grupo do ovo mesmo que o cru tenha
 * virado o "pai" na importação).
 */
export async function getFoodsGrouped(search?: string, category?: string) {
  const foods = await prisma.food.findMany({
    where: {
      active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { baseName: { contains: search, mode: "insensitive" } },
              { aliases: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    },
    orderBy: [{ baseName: "asc" }, { preparation: "asc" }],
  });

  const groups = new Map<string, typeof foods>();
  for (const food of foods) {
    const list = groups.get(food.baseName) ?? [];
    list.push(food);
    groups.set(food.baseName, list);
  }

  return [...groups.values()]
    .map((variants) => ({
      baseName: variants[0].baseName,
      representative: variants.find((v) => v.preparation === "NAO_APLICA") ?? variants[0],
      variants,
    }))
    .sort((a, b) => a.baseName.localeCompare(b.baseName, "pt-BR"));
}

export async function getFoodCategories() {
  const rows = await prisma.food.findMany({
    where: { active: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category as string);
}

export async function getClientsBasic() {
  return prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, goal: true, status: true },
    orderBy: { name: "asc" },
  });
}

/** Agendamentos de um mês (year: ano cheio, month: 0-11), para a view de calendário. */
export async function getAppointmentsForMonth(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return prisma.appointment.findMany({
    where: { scheduledAt: { gte: start, lt: end } },
    orderBy: { scheduledAt: "asc" },
    include: { client: { select: { id: true, name: true } } },
  });
}

/** Próximos agendamentos (a partir de agora), para a agenda lateral. */
export async function getUpcomingAppointments(limit = 10) {
  return prisma.appointment.findMany({
    where: { scheduledAt: { gte: new Date() }, status: { in: ["AGENDADO", "CONFIRMADO"] } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    include: { client: { select: { id: true, name: true } } },
  });
}

export async function getMealPlanForExport(mealPlanId: string) {
  return prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
    include: {
      client: true,
      consultation: true,
      initialGuidance: true,
      meals: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
            include: {
              items: {
                orderBy: { order: "asc" },
                include: {
                  food: true,
                  foodMeasure: true,
                  recipe: { include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } } } },
                  choiceGroup: { include: { items: { orderBy: { order: "asc" }, include: { food: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** Medida de peso mais próxima da data informada (nunca inventa peso — 5.4.5/5.5.1). */
export async function getNearestMeasurement(clientId: string, date: Date) {
  const measurements = await prisma.measurement.findMany({ where: { clientId }, orderBy: { date: "asc" } });
  if (measurements.length === 0) return null;
  return measurements.reduce((closest, m) => (Math.abs(m.date.getTime() - date.getTime()) < Math.abs(closest.date.getTime() - date.getTime()) ? m : closest));
}

export async function getClientForExamsExport(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: { exams: { orderBy: { requestedDate: "desc" } } },
  });
}

export async function getExamResultsGrouped(clientId: string) {
  const [client, results, references] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
    prisma.examResult.findMany({ where: { clientId }, orderBy: { collectedAt: "asc" }, include: { parameter: true } }),
    prisma.clientExamReference.findMany({ where: { clientId } }),
  ]);
  if (!client) return null;

  const referenceByParameterId = new Map(references.map((r) => [r.parameterId, r]));

  const byParameter = new Map<string, typeof results>();
  for (const r of results) {
    const list = byParameter.get(r.parameterName) ?? [];
    list.push(r);
    byParameter.set(r.parameterName, list);
  }

  const parameters = [...byParameter.entries()]
    .map(([parameterName, points]) => {
      const latest = points.at(-1)!;
      const clientRef = latest.parameterId ? referenceByParameterId.get(latest.parameterId) : undefined;
      return {
        parameterName,
        unit: latest.unit,
        referenceText: latest.referenceText,
        referenceMin: latest.referenceMin,
        referenceMax: latest.referenceMax,
        latest,
        // effectiveFlag/flagSource podem ser null em linhas antigas nunca recalculadas — cai no
        // legado `flag` (calculado só a partir do laudo) nesse caso.
        flag: latest.effectiveFlag ?? latest.flag,
        flagSource: latest.flagSource,
        parameterId: latest.parameterId,
        canonicalName: latest.parameter?.canonicalName ?? null,
        clientRef: clientRef ? { refMin: clientRef.refMin, refMax: clientRef.refMax, refText: clientRef.refText, reason: clientRef.reason } : null,
        points,
      };
    })
    .sort((a, b) => a.parameterName.localeCompare(b.parameterName, "pt-BR"));

  return { client, parameters };
}

export async function getConsultationFormByToken(token: string) {
  return prisma.consultationForm.findUnique({
    where: { token },
    include: { client: true },
  });
}

// Janela (em dias desde a última consulta) considerada para o alerta de retorno —
// o ciclo padrão de acompanhamento nutricional é de ~30 dias.
const RETURN_REMINDER_MIN_DAYS = 25;
const RETURN_REMINDER_MAX_DAYS = 60;

export async function getFollowUpDue() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      consultations: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
    },
  });

  const today = new Date();
  const dueList = clients
    .filter((c) => c.consultations[0])
    .map((c) => {
      const lastConsultation = c.consultations[0]!.date;
      const daysSince = Math.floor((today.getTime() - lastConsultation.getTime()) / 86_400_000);
      return { id: c.id, name: c.name, email: c.email, phone: c.phone, lastConsultation, daysSince };
    })
    .filter((c) => c.daysSince >= RETURN_REMINDER_MIN_DAYS && c.daysSince <= RETURN_REMINDER_MAX_DAYS)
    .sort((a, b) => b.daysSince - a.daysSince);

  return dueList;
}

export async function getDashboardStats() {
  const [totalClients, board, recipesCount, latestMeasurements, followUpDue, pendingRescheduleRequests] = await Promise.all([
    prisma.client.count(),
    getKanbanBoard(),
    prisma.recipe.count(),
    prisma.measurement.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { client: true },
    }),
    getFollowUpDue(),
    getPendingRescheduleRequests(),
  ]);

  const avgAdherence = await prisma.dietLog.aggregate({ _avg: { adherence: true } });

  return {
    totalClients,
    board,
    recipesCount,
    latestMeasurements,
    followUpDue,
    pendingRescheduleRequests,
    avgAdherence: Math.round(avgAdherence._avg.adherence ?? 0),
  };
}

/** 5.9.2 ponto 2 — cartão "Solicitações de reagendamento (N)" no dashboard. */
export async function getPendingRescheduleRequests() {
  return prisma.appointmentRescheduleRequest.findMany({
    where: { status: "PENDENTE" },
    orderBy: { createdAt: "asc" },
    include: { appointment: { include: { client: { select: { id: true, name: true } } } } },
  });
}

/** Dados da nutricionista usados no cabeçalho/rodapé dos PDFs — sempre retorna algo (cria o padrão se ainda não existir). */
export async function getProfessionalSettings() {
  return prisma.professionalSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function getGuidanceTexts() {
  return prisma.guidanceText.findMany({ orderBy: [{ type: "asc" }, { title: "asc" }] });
}

// ---------------------------------------------------------------------------
// Suplementos (Fase 6)
// ---------------------------------------------------------------------------

/** Ativos curados (não-arquivados) com as marcas de produto já cadastradas, para a tela de
 * prescrição (sugestão de posologia/marcas) e para a aba "Ativos" de `/suplementos`. */
export async function getActiveSupplementsForPrescription() {
  return prisma.supplement.findMany({
    where: { active: true },
    orderBy: { activeName: "asc" },
    include: { products: { where: { active: true }, include: { brand: true } } },
  });
}

export async function getSupplementCatalog() {
  const [actives, archived, brands, formulas] = await Promise.all([
    prisma.supplement.findMany({
      where: { active: true },
      orderBy: { activeName: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.supplement.count({ where: { active: false } }),
    prisma.supplementBrand.findMany({
      orderBy: { name: "asc" },
      include: { products: { where: { active: true }, orderBy: { commercialName: "asc" }, include: { supplement: true } } },
    }),
    prisma.compoundedFormula.findMany({
      orderBy: { name: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
  ]);
  return { actives, archivedCount: archived, brands, formulas };
}

export async function getClientSupplementPrescriptions(clientId: string) {
  return prisma.supplementPrescription.findMany({
    where: { clientId },
    orderBy: { version: "desc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { supplement: true, formula: true },
      },
    },
  });
}

export async function getSupplementPrescriptionForExport(prescriptionId: string) {
  return prisma.supplementPrescription.findUnique({
    where: { id: prescriptionId },
    include: {
      client: true,
      items: {
        orderBy: { order: "asc" },
        include: { supplement: true, formula: true },
      },
    },
  });
}
