import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/db";

const OLD_BUCKET = "uploads";
const PUBLIC_BUCKET = "public-assets";
const PATIENT_BUCKET = "patient-docs";

async function main() {
  const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  console.log("Criando buckets novos (se não existirem)...");
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const names = buckets?.map((b) => b.name) ?? [];
  if (!names.includes(PUBLIC_BUCKET)) {
    await supabaseAdmin.storage.createBucket(PUBLIC_BUCKET, { public: true });
    console.log(`  ✓ bucket "${PUBLIC_BUCKET}" criado (público)`);
  }
  if (!names.includes(PATIENT_BUCKET)) {
    await supabaseAdmin.storage.createBucket(PATIENT_BUCKET, { public: false });
    console.log(`  ✓ bucket "${PATIENT_BUCKET}" criado (privado)`);
  }

  // --- 1. Migra objetos públicos (foods, recipes, settings) para public-assets ---
  const publicFolders = ["foods", "recipes", "settings"];
  const urlRewrite = new Map<string, string>(); // URL antiga -> URL nova

  for (const folder of publicFolders) {
    const { data: files, error } = await supabaseAdmin.storage.from(OLD_BUCKET).list(folder, { limit: 1000 });
    if (error || !files) {
      console.log(`  ⚠ falha ao listar ${folder}: ${error?.message}`);
      continue;
    }
    console.log(`Migrando ${files.length} arquivo(s) de "${folder}"...`);
    for (const f of files) {
      const objectPath = `${folder}/${f.name}`;
      const { data: downloaded, error: dlErr } = await supabaseAdmin.storage.from(OLD_BUCKET).download(objectPath);
      if (dlErr || !downloaded) {
        console.log(`    ⚠ falha ao baixar ${objectPath}: ${dlErr?.message}`);
        continue;
      }
      const buffer = Buffer.from(await downloaded.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage
        .from(PUBLIC_BUCKET)
        .upload(objectPath, buffer, { contentType: downloaded.type || "application/octet-stream", upsert: true });
      if (upErr) {
        console.log(`    ⚠ falha ao enviar ${objectPath} para ${PUBLIC_BUCKET}: ${upErr.message}`);
        continue;
      }
      const oldUrl = supabaseAdmin.storage.from(OLD_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const newUrl = supabaseAdmin.storage.from(PUBLIC_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      urlRewrite.set(oldUrl, newUrl);
    }
    console.log(`  ✓ "${folder}" migrado (${urlRewrite.size} URLs mapeadas até agora)`);
  }

  // --- 2. Migra documentos sensíveis (exame-resultados, exames) para patient-docs ---
  const patientFolders = ["exame-resultados", "exames"];
  const pathRewrite = new Map<string, string>(); // URL antiga (pública) -> caminho novo (objeto, sem URL)
  const migratedOldPaths: string[] = [];

  for (const folder of patientFolders) {
    const { data: files, error } = await supabaseAdmin.storage.from(OLD_BUCKET).list(folder, { limit: 1000 });
    if (error || !files) {
      console.log(`  ⚠ falha ao listar ${folder}: ${error?.message}`);
      continue;
    }
    console.log(`Migrando ${files.length} documento(s) de "${folder}" para bucket privado...`);
    for (const f of files) {
      const objectPath = `${folder}/${f.name}`;
      const { data: downloaded, error: dlErr } = await supabaseAdmin.storage.from(OLD_BUCKET).download(objectPath);
      if (dlErr || !downloaded) {
        console.log(`    ⚠ falha ao baixar ${objectPath}: ${dlErr?.message}`);
        continue;
      }
      const buffer = Buffer.from(await downloaded.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage
        .from(PATIENT_BUCKET)
        .upload(objectPath, buffer, { contentType: downloaded.type || "application/pdf", upsert: true });
      if (upErr) {
        console.log(`    ⚠ falha ao enviar ${objectPath} para ${PATIENT_BUCKET}: ${upErr.message}`);
        continue;
      }
      const oldUrl = supabaseAdmin.storage.from(OLD_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      pathRewrite.set(oldUrl, objectPath);
      migratedOldPaths.push(objectPath);
    }
  }
  console.log(`  ✓ documentos sensíveis migrados: ${pathRewrite.size}`);

  // --- 3. Atualiza o banco de dados ---
  console.log("\nAtualizando referências no banco de dados...");

  let foodsUpdated = 0;
  const foods = await prisma.food.findMany({ where: { imageUrl: { not: null } } });
  for (const food of foods) {
    const newUrl = urlRewrite.get(food.imageUrl!);
    if (newUrl) {
      await prisma.food.update({ where: { id: food.id }, data: { imageUrl: newUrl } });
      foodsUpdated++;
    }
  }
  console.log(`  ✓ Food.imageUrl atualizado: ${foodsUpdated}/${foods.length}`);

  let recipesUpdated = 0;
  const recipes = await prisma.recipe.findMany({ where: { imageUrl: { not: null } } });
  for (const recipe of recipes) {
    const newUrl = urlRewrite.get(recipe.imageUrl!);
    if (newUrl) {
      await prisma.recipe.update({ where: { id: recipe.id }, data: { imageUrl: newUrl } });
      recipesUpdated++;
    }
  }
  console.log(`  ✓ Recipe.imageUrl atualizado: ${recipesUpdated}/${recipes.length}`);

  const settings = await prisma.professionalSettings.findUnique({ where: { id: "default" } });
  if (settings?.logoUrl) {
    const newUrl = urlRewrite.get(settings.logoUrl);
    if (newUrl) {
      await prisma.professionalSettings.update({ where: { id: "default" }, data: { logoUrl: newUrl } });
      console.log("  ✓ ProfessionalSettings.logoUrl atualizado");
    }
  }

  let examResultsUpdated = 0;
  const examResults = await prisma.examResult.findMany({ where: { sourceFileUrl: { not: null } } });
  for (const er of examResults) {
    const newPath = pathRewrite.get(er.sourceFileUrl!);
    if (newPath) {
      await prisma.examResult.update({ where: { id: er.id }, data: { sourceFileUrl: newPath } });
      examResultsUpdated++;
    }
  }
  console.log(`  ✓ ExamResult.sourceFileUrl atualizado (agora guarda caminho, não URL): ${examResultsUpdated}/${examResults.length}`);

  let examsUpdated = 0;
  const exams = await prisma.exam.findMany({ where: { fileUrl: { not: null } } });
  for (const ex of exams) {
    const newPath = pathRewrite.get(ex.fileUrl!);
    if (newPath) {
      await prisma.exam.update({ where: { id: ex.id }, data: { fileUrl: newPath } });
      examsUpdated++;
    }
  }
  console.log(`  ✓ Exam.fileUrl atualizado: ${examsUpdated}/${exams.length}`);

  // --- 4. Remove os documentos sensíveis do bucket antigo (público) ---
  if (migratedOldPaths.length > 0) {
    const { error: rmErr } = await supabaseAdmin.storage.from(OLD_BUCKET).remove(migratedOldPaths);
    if (rmErr) {
      console.log(`  ⚠ falha ao remover do bucket antigo: ${rmErr.message}`);
    } else {
      console.log(`  ✓ ${migratedOldPaths.length} documento(s) sensível(is) removido(s) do bucket público antigo`);
    }
  }

  console.log("\n✅ Migração de buckets concluída.");
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
