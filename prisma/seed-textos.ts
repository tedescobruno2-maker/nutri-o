import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seed da Biblioteca de Textos a partir das 71 frases literais consolidadas dos 10 planos reais
// (prisma/seed-data/planos-catalogo-sanitized.json — sem nenhum identificador de paciente).
// Idempotente: upsert por `content` (chave natural, único no schema).

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const DATA_PATH = path.join(__dirname, "seed-data", "planos-catalogo-sanitized.json");

function guessType(blocos: string[]): "HIDRATACAO" | "TAREFA_INICIAL" | "ORIENTACAO_GERAL" {
  if (blocos.some((b) => b.toUpperCase().includes("12 HR") || b.toUpperCase().includes("HIDRATA"))) return "HIDRATACAO";
  if (blocos.some((b) => b.toUpperCase().includes("TAREFA"))) return "TAREFA_INICIAL";
  return "ORIENTACAO_GERAL";
}

function titleFrom(content: string): string {
  const clean = content.trim().replace(/\s+/g, " ");
  return clean.length <= 60 ? clean : `${clean.slice(0, 57)}...`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as {
    frases_orientacao: Array<{ texto_literal: string; ocorrencias: number; blocos: string[] }>;
  };

  let created = 0;
  let updated = 0;
  let ignored = 0;

  for (const frase of data.frases_orientacao) {
    const content = frase.texto_literal.trim();
    if (!content) {
      ignored++;
      continue;
    }

    const type = guessType(frase.blocos);
    const tags = frase.blocos.join(",");
    const title = titleFrom(content);

    const existing = await prisma.guidanceText.findUnique({ where: { content } });
    if (existing) {
      await prisma.guidanceText.update({ where: { id: existing.id }, data: { title, type, tags } });
      updated++;
    } else {
      await prisma.guidanceText.create({ data: { title, content, type, tags } });
      created++;
    }
  }

  console.log("=== Importação da Biblioteca de Textos (planos reais) concluída ===");
  console.log(`Frases processadas: ${data.frases_orientacao.length}`);
  console.log(`Criadas: ${created} | Atualizadas: ${updated} | Ignoradas: ${ignored}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
