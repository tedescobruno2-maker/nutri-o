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

export async function getConsultationFormByToken(token: string) {
  return prisma.consultationForm.findUnique({
    where: { token },
    include: { client: true },
  });
}

export async function getDashboardStats() {
  const [totalClients, board, recipesCount, latestMeasurements] = await Promise.all([
    prisma.client.count(),
    getKanbanBoard(),
    prisma.recipe.count(),
    prisma.measurement.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { client: true },
    }),
  ]);

  const avgAdherence = await prisma.dietLog.aggregate({ _avg: { adherence: true } });

  return {
    totalClients,
    board,
    recipesCount,
    latestMeasurements,
    avgAdherence: Math.round(avgAdherence._avg.adherence ?? 0),
  };
}
