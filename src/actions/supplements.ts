"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

/** CRUD do catálogo de Suplementos (Fase 3 da reorganização do Plano Alimentar) — antes disto
 * não existia NENHUMA mutação aqui (só populado por script). Segue o mesmo padrão já usado em
 * settings.ts/foods.ts/recipes.ts: undefined-on-empty na criação, ?? null-on-empty na edição
 * (campo em branco limpa o valor anterior). "Remover" de Ativo e Produto é arquivar (active:false)
 * — já era o mecanismo existente (archivedCount em getSupplementCatalog), preserva prescrições
 * antigas que apontam pra eles. Marca e Fórmula não têm active — remoção é física, mas bloqueada
 * pelo próprio banco (FK) se estiverem em uso, erro traduzido pra mensagem amigável.
 */

function revalidateSupplements() {
  revalidatePath("/suplementos");
}

// --------------------------------------------------------------------------
// Supplement (ativo)
// --------------------------------------------------------------------------

const supplementSchema = z.object({
  activeName: z.string().min(1, "Nome do ativo é obrigatório"),
  category: z.string().optional(),
  origin: z.enum(["LOJA_SUPLEMENTOS", "MANIPULADO", "AMBOS"]).default("LOJA_SUPLEMENTOS"),
  defaultDose: z.string().optional(),
  defaultTiming: z.string().optional(),
  defaultRoute: z.string().optional(),
  ulNote: z.string().optional(),
  notes: z.string().optional(),
});

function readSupplementForm(formData: FormData) {
  return supplementSchema.parse({
    activeName: formData.get("activeName"),
    category: formData.get("category") || undefined,
    origin: formData.get("origin") || "LOJA_SUPLEMENTOS",
    defaultDose: formData.get("defaultDose") || undefined,
    defaultTiming: formData.get("defaultTiming") || undefined,
    defaultRoute: formData.get("defaultRoute") || undefined,
    ulNote: formData.get("ulNote") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createSupplement(formData: FormData) {
  const parsed = readSupplementForm(formData);
  await prisma.supplement.create({ data: parsed });
  revalidateSupplements();
}

export async function updateSupplement(formData: FormData) {
  const id = formData.get("id") as string;
  const parsed = readSupplementForm(formData);
  await prisma.supplement.update({
    where: { id },
    data: {
      activeName: parsed.activeName,
      category: parsed.category ?? null,
      origin: parsed.origin,
      defaultDose: parsed.defaultDose ?? null,
      defaultTiming: parsed.defaultTiming ?? null,
      defaultRoute: parsed.defaultRoute ?? null,
      ulNote: parsed.ulNote ?? null,
      notes: parsed.notes ?? null,
    },
  });
  revalidateSupplements();
}

/** "Remover" = arquivar (active:false) — mesmo mecanismo que já existia (archivedCount),
 * preserva prescrições antigas que apontam para este ativo. */
export async function deleteSupplement(id: string) {
  await prisma.supplement.update({ where: { id }, data: { active: false } });
  revalidateSupplements();
}

// --------------------------------------------------------------------------
// SupplementBrand (marca)
// --------------------------------------------------------------------------

const brandSchema = z.object({
  name: z.string().min(1, "Nome da marca é obrigatório"),
  website: z.string().optional(),
  notes: z.string().optional(),
});

export async function createSupplementBrand(formData: FormData) {
  const parsed = brandSchema.parse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
  });
  await prisma.supplementBrand.create({ data: parsed });
  revalidateSupplements();
}

export async function updateSupplementBrand(formData: FormData) {
  const id = formData.get("id") as string;
  const parsed = brandSchema.parse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
  });
  await prisma.supplementBrand.update({
    where: { id },
    data: { name: parsed.name, website: parsed.website ?? null, notes: parsed.notes ?? null },
  });
  revalidateSupplements();
}

/** Marca não tem active — remoção é física, mas só permitida sem produtos vinculados (o próprio
 * botão de remover fica escondido na UI quando há produtos; isto aqui é a segunda trava). */
export async function deleteSupplementBrand(id: string) {
  const count = await prisma.supplementProduct.count({ where: { brandId: id } });
  if (count > 0) throw new Error(`Não é possível remover: ${count} produto(s) cadastrado(s) nesta marca.`);
  await prisma.supplementBrand.delete({ where: { id } });
  revalidateSupplements();
}

// --------------------------------------------------------------------------
// SupplementProduct (marca/produto)
// --------------------------------------------------------------------------

const productSchema = z.object({
  supplementId: z.string().min(1, "Selecione o ativo"),
  brandId: z.string().min(1, "Selecione a marca"),
  commercialName: z.string().min(1, "Nome comercial é obrigatório"),
  presentation: z.string().optional(),
  flavors: z.string().optional(),
  doseLabel: z.string().optional(),
  anvisaRef: z.string().optional(),
  sourceRef: z.string().optional(),
});

function readProductForm(formData: FormData) {
  return productSchema.parse({
    supplementId: formData.get("supplementId"),
    brandId: formData.get("brandId"),
    commercialName: formData.get("commercialName"),
    presentation: formData.get("presentation") || undefined,
    flavors: formData.get("flavors") || undefined,
    doseLabel: formData.get("doseLabel") || undefined,
    anvisaRef: formData.get("anvisaRef") || undefined,
    sourceRef: formData.get("sourceRef") || undefined,
  });
}

export async function createSupplementProduct(formData: FormData) {
  const parsed = readProductForm(formData);
  await prisma.supplementProduct.create({ data: parsed });
  revalidateSupplements();
}

export async function updateSupplementProduct(formData: FormData) {
  const id = formData.get("id") as string;
  const parsed = readProductForm(formData);
  await prisma.supplementProduct.update({
    where: { id },
    data: {
      supplementId: parsed.supplementId,
      brandId: parsed.brandId,
      commercialName: parsed.commercialName,
      presentation: parsed.presentation ?? null,
      flavors: parsed.flavors ?? null,
      doseLabel: parsed.doseLabel ?? null,
      anvisaRef: parsed.anvisaRef ?? null,
      sourceRef: parsed.sourceRef ?? null,
    },
  });
  revalidateSupplements();
}

/** "Remover" = arquivar (active:false), mesmo padrão de Supplement. */
export async function deleteSupplementProduct(id: string) {
  await prisma.supplementProduct.update({ where: { id }, data: { active: false } });
  revalidateSupplements();
}

// --------------------------------------------------------------------------
// CompoundedFormula (fórmula manipulada) + items
// --------------------------------------------------------------------------

const formulaItemSchema = z.object({
  supplementId: z.string().optional(),
  activeName: z.string().min(1),
  quantity: z.string().min(1),
});

const formulaSchema = z.object({
  name: z.string().min(1, "Nome da fórmula é obrigatório"),
  presentation: z.string().optional(),
  posology: z.string().optional(),
  route: z.string().optional(),
  notes: z.string().optional(),
});

function readFormulaForm(formData: FormData) {
  return formulaSchema.parse({
    name: formData.get("name"),
    presentation: formData.get("presentation") || undefined,
    posology: formData.get("posology") || undefined,
    route: formData.get("route") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

function readFormulaItems(formData: FormData) {
  const itemsJson = formData.get("itemsJson") as string | null;
  const items = itemsJson ? formulaItemSchema.array().parse(JSON.parse(itemsJson)) : [];
  return items
    .filter((item) => item.activeName.trim() && item.quantity.trim())
    .map((item) => ({ ...item, supplementId: item.supplementId || undefined }));
}

export async function createCompoundedFormula(formData: FormData) {
  const parsed = readFormulaForm(formData);
  const items = readFormulaItems(formData);
  await prisma.compoundedFormula.create({
    data: {
      ...parsed,
      items: { create: items.map((item, index) => ({ ...item, order: index })) },
    },
  });
  revalidateSupplements();
}

export async function updateCompoundedFormula(formData: FormData) {
  const id = formData.get("id") as string;
  const parsed = readFormulaForm(formData);
  const items = readFormulaItems(formData);
  await prisma.compoundedFormula.update({
    where: { id },
    data: {
      name: parsed.name,
      presentation: parsed.presentation ?? null,
      posology: parsed.posology ?? null,
      route: parsed.route ?? null,
      notes: parsed.notes ?? null,
      items: {
        deleteMany: {},
        create: items.map((item, index) => ({ ...item, order: index })),
      },
    },
  });
  revalidateSupplements();
}

export async function deleteCompoundedFormula(id: string) {
  try {
    await prisma.compoundedFormula.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new Error("Não é possível remover: esta fórmula já foi usada em uma prescrição de paciente.");
    }
    throw err;
  }
  revalidateSupplements();
}
