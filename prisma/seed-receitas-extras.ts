import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeRecipeMacros } from "../src/lib/recipeCalc";

/**
 * Seed das receitas extras (7.1: seed/planos-catalogo.json → receitas_extras), ingredientes e
 * modo de preparo LITERAIS, nunca reescritos. Fonte sanitizada em
 * prisma/seed-data/receitas-extras-sanitized.json (removido `planos_onde_aparece` e
 * `diferencas_entre_planos` do original — continham nome de paciente, não pode ser commitado).
 *
 * Nota sobre a contagem "16 receitas" do plano mestre: as 18 entradas da fonte têm só 16
 * *strings* de título distintas — "MOLHO PARA SALADA" se repete 4 vezes (às vezes com dois-pontos
 * no fim) — mas comparando o ingrediente literal, são 4 molhos realmente diferentes (mostarda
 * dijon, hortelã, vinagre de maçã, parmesão), não 2 nem 1.
 *
 * 17 das 18 entradas já estavam no banco — importadas manualmente numa fase anterior, com nomes e
 * texto de ingrediente já limpos/reformatados por revisão humana (verificado item a item, à mão,
 * comparando ingrediente por ingrediente — um casamento automático por similaridade de texto se
 * mostrou pouco confiável demais para essa reformatação e criou duplicata na primeira tentativa,
 * desfeita antes de chegar aqui). Só a variante de parmesão (ordem 18) faltava — foi criada e
 * renomeada para "Molho para Salada (Parmesão)", no mesmo padrão das outras 3. Este script fica
 * idempotente por essa checagem explícita, não por heurística de texto.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const PARMESAO_FINAL_NAME = "Molho para Salada (Parmesão)";

const PRE_EXISTING_RECIPE_NAMES = [
  "Berinjela Assada ou Abobrinha Assada",
  "Caldo de Abobrinha com Alho-poró (Lowcarb)",
  "Escondidinho de Frango com Creme de Couve Flor ou Batata Inglesa/Doce",
  "Espaguete de Abobrinha ou Cenoura ou Pupunha",
  "Estrogonofe de Frango",
  "Granola Salgada",
  "Guacamole",
  "Hambúrguer Caseiro",
  "Lasanha de Berinjela ou Abobrinha",
  "Molho para Salada (Iogurte e Hortelã)",
  "Molho para Salada (Iogurte e Mostarda Dijon)",
  "Molho para Salada (vinagre de maçã)",
  "Patê de Frango ou Atum",
  "Peixe Assado na Airfryer",
  "Quibe de Carne com Couve Flor",
  "Quibe de Quinoa",
  "Sopa de Palmito Pupunha com Cogumelos (Lowcarb)",
];

type ExtraRecipe = {
  ordem: number;
  nome_literal: string;
  ingredientes_literais: string[];
  modo_de_preparo_literal: string[];
};

async function main() {
  const raw: ExtraRecipe[] = JSON.parse(
    require("fs").readFileSync(require("path").join(__dirname, "seed-data", "receitas-extras-sanitized.json"), "utf-8")
  );

  const entry = raw.find((r) => r.ordem === 18);
  if (!entry) throw new Error("Entrada ordem=18 (molho de parmesão) não encontrada na fonte — verifique receitas-extras-sanitized.json.");

  const existing = await prisma.recipe.findFirst({ where: { name: PARMESAO_FINAL_NAME } });
  if (existing) {
    console.log(`Já existe: ${PARMESAO_FINAL_NAME} — nada a fazer.`);
  } else {
    const recipe = await prisma.recipe.create({
      data: {
        name: PARMESAO_FINAL_NAME,
        ingredients: entry.ingredientes_literais.join("\n"),
        instructions: entry.modo_de_preparo_literal.join("\n\n"),
        mealCategory: "extra",
        isExtra: true,
      },
    });
    const macros = computeRecipeMacros(recipe.name, null, []);
    await prisma.recipe.update({ where: { id: recipe.id }, data: macros });
    console.log(`Criada: ${PARMESAO_FINAL_NAME}`);
  }

  // As 17 receitas já importadas numa fase anterior nunca tinham a marcação isExtra (o campo não
  // existia ainda) — como são literalmente as mesmas receitas_extras da fonte, marcamos aqui.
  const marked = await prisma.recipe.updateMany({
    where: { name: { in: PRE_EXISTING_RECIPE_NAMES } },
    data: { isExtra: true, mealCategory: "extra" },
  });

  console.log("\n=== Seed de receitas extras concluído ===");
  console.log(`Fonte: ${raw.length} entradas — 17 já importadas em fase anterior (${marked.count} marcadas isExtra=true agora), 1 nova (ordem 18).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
