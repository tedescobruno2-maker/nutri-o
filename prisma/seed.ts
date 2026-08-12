import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function weeksAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d;
}

async function main() {
  await prisma.dietLog.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.client.deleteMany();

  const clientsData = [
    {
      name: "Ana Beatriz Souza",
      email: "ana.souza@example.com",
      phone: "(11) 98888-1234",
      age: 29,
      height: 165,
      goal: "Emagrecimento",
      status: "NOVOS" as const,
      order: 0,
      startWeight: 78,
    },
    {
      name: "Carlos Eduardo Lima",
      email: "carlos.lima@example.com",
      phone: "(21) 97777-4321",
      age: 34,
      height: 178,
      goal: "Hipertrofia",
      status: "EM_AVALIACAO" as const,
      order: 0,
      startWeight: 82,
    },
    {
      name: "Fernanda Rocha",
      email: "fernanda.rocha@example.com",
      phone: "(31) 96666-5678",
      age: 41,
      height: 160,
      goal: "Reeducação alimentar",
      status: "PLANO_ENTREGUE" as const,
      order: 0,
      startWeight: 70,
    },
    {
      name: "João Pedro Almeida",
      email: "joao.almeida@example.com",
      phone: "(41) 95555-8765",
      age: 25,
      height: 180,
      goal: "Ganho de massa magra",
      status: "ACOMPANHAMENTO" as const,
      order: 0,
      startWeight: 68,
    },
    {
      name: "Mariana Costa",
      email: "mariana.costa@example.com",
      phone: "(51) 94444-2468",
      age: 37,
      height: 168,
      goal: "Emagrecimento",
      status: "ACOMPANHAMENTO" as const,
      order: 1,
      startWeight: 85,
    },
    {
      name: "Rafael Nogueira",
      email: "rafael.nogueira@example.com",
      phone: "(61) 93333-1357",
      age: 30,
      height: 175,
      goal: "Performance esportiva",
      status: "EM_AVALIACAO" as const,
      order: 1,
      startWeight: 74,
    },
  ];

  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        age: c.age,
        height: c.height,
        goal: c.goal,
        status: c.status,
        order: c.order,
      },
    });

    // 8 semanas de histórico de medidas com tendência de progresso
    const direction = c.goal === "Ganho de massa magra" || c.goal === "Hipertrofia" ? 1 : -1;
    for (let i = 8; i >= 0; i--) {
      const drift = (8 - i) * 0.35 * direction;
      const noise = (Math.random() - 0.5) * 0.6;
      await prisma.measurement.create({
        data: {
          clientId: client.id,
          date: weeksAgo(i),
          weight: Math.round((c.startWeight + drift + noise) * 10) / 10,
          bodyFat: Math.round((28 - (8 - i) * 0.3 + (Math.random() - 0.5)) * 10) / 10,
          waist: Math.round((90 - (8 - i) * 0.4 * (direction === -1 ? 1 : 0.2)) * 10) / 10,
          hip: Math.round((100 - (8 - i) * 0.2) * 10) / 10,
        },
      });

      await prisma.dietLog.create({
        data: {
          clientId: client.id,
          weekStart: weeksAgo(i),
          adherence: Math.max(40, Math.min(100, Math.round(60 + (8 - i) * 4 + (Math.random() - 0.5) * 15))),
          protein: Math.round(90 + Math.random() * 60),
          carbs: Math.round(150 + Math.random() * 100),
          fat: Math.round(40 + Math.random() * 30),
        },
      });
    }
  }

  const recipes = [
    {
      name: "Omelete de Claras com Espinafre",
      description: "Café da manhã leve e rico em proteína.",
      ingredients: "4 claras de ovo\n1 ovo inteiro\n1 xícara de espinafre\nSal e pimenta a gosto\n1 fio de azeite",
      instructions: "Bata os ovos, adicione o espinafre picado, tempere e cozinhe em fogo médio até firmar.",
      calories: 220,
      protein: 28,
      carbs: 4,
      fat: 10,
      tags: "café da manhã,low carb,alta proteína",
    },
    {
      name: "Frango Grelhado com Batata Doce",
      description: "Almoço clássico para ganho de massa magra.",
      ingredients: "150g de peito de frango\n150g de batata doce\nBrócolis a vapor\nAzeite e temperos naturais",
      instructions: "Grelhe o frango temperado, cozinhe a batata doce e o brócolis no vapor.",
      calories: 420,
      protein: 40,
      carbs: 45,
      fat: 8,
      tags: "almoço,hipertrofia",
    },
    {
      name: "Bowl de Salmão e Quinoa",
      description: "Fonte de ômega-3 e carboidrato de baixo índice glicêmico.",
      ingredients: "120g de salmão\n1/2 xícara de quinoa cozida\nAbacate\nRúcula\nLimão",
      instructions: "Grelhe o salmão, monte o bowl com quinoa, abacate fatiado e rúcula, finalize com limão.",
      calories: 480,
      protein: 32,
      carbs: 38,
      fat: 22,
      tags: "jantar,ômega-3",
    },
    {
      name: "Smoothie Verde Detox",
      description: "Lanche refrescante rico em fibras.",
      ingredients: "1 folha de couve\n1/2 banana\n1 fatia de abacaxi\nÁgua de coco\nGengibre",
      instructions: "Bata todos os ingredientes no liquidificador até homogeneizar.",
      calories: 150,
      protein: 3,
      carbs: 34,
      fat: 1,
      tags: "lanche,detox,vegano",
    },
    {
      name: "Panqueca de Aveia e Banana",
      description: "Opção prática de café da manhã ou pré-treino.",
      ingredients: "1 banana amassada\n2 ovos\n3 colheres de aveia\nCanela a gosto",
      instructions: "Misture todos os ingredientes e frite pequenas porções em frigideira antiaderente.",
      calories: 260,
      protein: 14,
      carbs: 32,
      fat: 7,
      tags: "café da manhã,pré-treino",
    },
    {
      name: "Salada de Grão-de-Bico com Atum",
      description: "Refeição rápida rica em fibras e proteína.",
      ingredients: "1 lata de atum\n1 xícara de grão-de-bico cozido\nTomate cereja\nCebola roxa\nAzeite e limão",
      instructions: "Misture todos os ingredientes em uma tigela e tempere com azeite e limão.",
      calories: 380,
      protein: 30,
      carbs: 36,
      fat: 12,
      tags: "almoço,fibras,alta proteína",
    },
  ];

  for (const r of recipes) {
    await prisma.recipe.create({ data: r });
  }

  console.log(`Seed concluído: ${clientsData.length} clientes, ${recipes.length} receitas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
