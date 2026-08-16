import "server-only";
import { prisma } from "@/lib/db";
import { KANBAN_STATUSES, type KanbanStatusValue } from "@/lib/utils";

export async function getKanbanBoard() {
  const clients = await prisma.client.findMany({
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
        consultationForms: { orderBy: { createdAt: "desc" }, take: 1 },
        consultations: { orderBy: { date: "desc" } },
        exams: { orderBy: { requestedDate: "desc" } },
        mealPlans: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            meals: {
              orderBy: { order: "asc" },
              include: {
                options: {
                  orderBy: { order: "asc" },
                  include: {
                    items: { orderBy: { order: "asc" }, include: { food: true, recipe: true } },
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

export async function getRecipes() {
  return prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getRecipesWithIngredients() {
  return prisma.recipe.findMany({
    orderBy: { createdAt: "desc" },
    include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } } },
  });
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } } },
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

export async function getClientsBasic() {
  return prisma.client.findMany({
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
                  recipe: { include: { ingredientItems: { orderBy: { order: "asc" }, include: { food: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getClientForExamsExport(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: { exams: { orderBy: { requestedDate: "desc" } } },
  });
}

export async function getExamResultsGrouped(clientId: string) {
  const [client, results] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
    prisma.examResult.findMany({ where: { clientId }, orderBy: { collectedAt: "asc" } }),
  ]);
  if (!client) return null;

  const byParameter = new Map<string, typeof results>();
  for (const r of results) {
    const list = byParameter.get(r.parameterName) ?? [];
    list.push(r);
    byParameter.set(r.parameterName, list);
  }

  const parameters = [...byParameter.entries()]
    .map(([parameterName, points]) => ({
      parameterName,
      unit: points.at(-1)!.unit,
      referenceText: points.at(-1)!.referenceText,
      referenceMin: points.at(-1)!.referenceMin,
      referenceMax: points.at(-1)!.referenceMax,
      latest: points.at(-1)!,
      flag: points.at(-1)!.flag,
      points,
    }))
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
  const [totalClients, board, recipesCount, latestMeasurements, followUpDue] = await Promise.all([
    prisma.client.count(),
    getKanbanBoard(),
    prisma.recipe.count(),
    prisma.measurement.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { client: true },
    }),
    getFollowUpDue(),
  ]);

  const avgAdherence = await prisma.dietLog.aggregate({ _avg: { adherence: true } });

  return {
    totalClients,
    board,
    recipesCount,
    latestMeasurements,
    followUpDue,
    avgAdherence: Math.round(avgAdherence._avg.adherence ?? 0),
  };
}
