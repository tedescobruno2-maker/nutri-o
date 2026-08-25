import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seed dos 9 Grupos de Escolha (D5) a partir dos planos reais consolidados
// (prisma/seed-data/planos-catalogo-sanitized.json). Idempotente: upsert por `name` (único).
//
// Os itens abaixo foram curados manualmente a partir do texto literal observado nos planos —
// nenhum item foi inventado. `quantity`/`unit` do item ficam null de propósito: a gramatura
// observada varia por plano (ex.: PROTEÍNA vai de 130 a 180 g conforme o paciente), e fixar um
// valor único aqui seria estimar, não relatar (guardrail: não estimar gramatura). O grupo
// resultante produz uma FAIXA de macros (D5), não um número único — é o comportamento correto.
// `foodId` fica null: ligar "Frango" a um corte/preparo específico da TACO seria presumir qual;
// isso é decisão do construtor de planos (Fase 9), não do catálogo.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

type GroupDef = {
  name: string;
  displayLabel: string;
  defaultQuantity: number | null;
  defaultUnit: string | null;
  quantityText: string | null;
  notes: string | null;
  order: number;
  items: string[];
};

const GROUPS: GroupDef[] = [
  {
    name: "Legumes / vegetais — almoço",
    displayLabel: "LEGUMES COZIDOS OU CRUS: 200 GR",
    defaultQuantity: 200,
    defaultUnit: "g",
    quantityText: null,
    notes: "Em alguns planos: 'a vontade', com 1 colher de café de azeite extra virgem nas saladas.",
    order: 0,
    items: ["Brócolis", "Couve-flor", "Abobrinha", "Vagem", "Quiabo", "Cenoura", "Berinjela", "Tomate", "Palmito", "Beterraba"],
  },
  {
    name: "Folhosos",
    displayLabel: "FOLHOSOS: A VONTADE",
    defaultQuantity: null,
    defaultUnit: null,
    quantityText: "A VONTADE",
    notes: "Priorizar vegetais verde escuros. Temperar com vinagre de maçã, azeite extra virgem e limão.",
    order: 1,
    items: ["Couve", "Repolho", "Espinafre", "Alface", "Rúcula", "Agrião"],
  },
  {
    name: "Proteína — almoço",
    displayLabel: "PROTEÍNA: 180 GR",
    defaultQuantity: null,
    defaultUnit: "g",
    quantityText: null,
    notes: "Gramatura observada nos planos reais varia entre 130 g e 180 g conforme o plano — ajustar no construtor.",
    order: 2,
    items: ["Peito de frango", "Lombo de porco", "Tilápia", "Linguado", "Salmão", "Atum", "Patinho", "Alcatra", "Filé mignon"],
  },
  {
    name: "Leguminosas",
    displayLabel: "LEGUMINOSAS: 1 CONCHA MÉDIA – 120 GR",
    defaultQuantity: null,
    defaultUnit: "g",
    quantityText: null,
    notes: "Gramatura observada varia entre 100 g e 120 g (medida caseira: 1 concha / concha média / concha pequena). Cozidos, em forma de vinagrete ou hommus. Deixar de molho ao menos 12h antes do cozimento.",
    order: 3,
    items: ["Feijão", "Grão de bico", "Lentilha", "Ervilha"],
  },
  {
    name: "Carboidrato",
    displayLabel: "CARBOIDRATO: ESCOLHER UMA OPÇÃO",
    defaultQuantity: null,
    defaultUnit: "g",
    quantityText: null,
    notes: "Gramatura observada varia amplamente por plano (60 g a 200 g conforme o alimento e a prescrição) — ajustar no construtor.",
    order: 4,
    items: ["Arroz", "Macarrão", "Batata inglesa", "Batata doce", "Mandioquinha", "Mandioca", "Abóbora", "Quinoa", "Inhame", "Grão de bico"],
  },
  {
    name: "Proteína magra — jantar/lanche",
    displayLabel: "PROTEINA MAGRA: 150 GR",
    defaultQuantity: null,
    defaultUnit: "g",
    quantityText: null,
    notes: "Gramatura observada varia entre 120 g e 200 g conforme o plano. Priorizar peixe e frango ou omeletes.",
    order: 5,
    items: ["Patinho moído", "Salmão", "Frango", "Hambúrguer caseiro", "Atum", "Sardinha", "Peixe", "Omelete (claras e gemas)"],
  },
  {
    name: "Legumes — jantar/lanche",
    displayLabel: "200 GR LEGUMES REFOGADOS OU COZIDOS",
    defaultQuantity: 200,
    defaultUnit: "g",
    quantityText: null,
    notes: null,
    order: 6,
    items: ["Brócolis", "Couve-flor", "Abobrinha", "Berinjela", "Palmito", "Tomate"],
  },
  {
    name: "Porção de frutas",
    displayLabel: "1 PORÇÃO DE FRUTAS",
    defaultQuantity: null,
    defaultUnit: null,
    quantityText: "1 PORÇÃO",
    notes: "Exemplos observados: 1/2 mamão, ou 200-250 g de melão, ou 250-300 g de melancia, ou abacaxi.",
    order: 7,
    items: ["Mamão", "Melão", "Melancia", "Abacaxi"],
  },
  {
    name: "Sobremesa",
    displayLabel: "SOBREMESA",
    defaultQuantity: null,
    defaultUnit: null,
    quantityText: "1 UNIDADE",
    notes: null,
    order: 8,
    items: ["Laranja", "Mexerica", "Kiwi", "Paçoquita zero", "Ferrero Rocher"],
  },
];

async function main() {
  let groupsCreated = 0;
  let groupsUpdated = 0;
  let itemsCreated = 0;
  let itemsSkipped = 0;

  for (const g of GROUPS) {
    const existing = await prisma.choiceGroup.findUnique({ where: { name: g.name } });
    const groupData = {
      displayLabel: g.displayLabel,
      defaultQuantity: g.defaultQuantity,
      defaultUnit: g.defaultUnit,
      quantityText: g.quantityText,
      notes: g.notes,
      order: g.order,
    };

    const group = existing
      ? await prisma.choiceGroup.update({ where: { id: existing.id }, data: groupData })
      : await prisma.choiceGroup.create({ data: { name: g.name, ...groupData } });
    if (existing) groupsUpdated++;
    else groupsCreated++;

    for (let i = 0; i < g.items.length; i++) {
      const description = g.items[i];
      const existingItem = await prisma.choiceGroupItem.findFirst({
        where: { choiceGroupId: group.id, description },
      });
      if (existingItem) {
        await prisma.choiceGroupItem.update({ where: { id: existingItem.id }, data: { order: i } });
        itemsSkipped++;
      } else {
        await prisma.choiceGroupItem.create({
          data: { choiceGroupId: group.id, description, order: i },
        });
        itemsCreated++;
      }
    }
  }

  console.log("=== Importação dos Grupos de Escolha concluída ===");
  console.log(`Grupos: ${GROUPS.length} (criados: ${groupsCreated}, atualizados: ${groupsUpdated})`);
  console.log(`Itens: criados ${itemsCreated}, já existentes (atualizados) ${itemsSkipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
