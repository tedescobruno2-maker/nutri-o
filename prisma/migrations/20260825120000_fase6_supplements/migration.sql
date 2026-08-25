-- Fase 6 do plano mestre — Suplementos e prescrição.
--
-- A tabela "Supplement" já existe com 48 linhas reais (nome + notes). O diff bruto do Prisma
-- propunha DROP COLUMN "name" + ADD COLUMN "activeName" NOT NULL, o que apagaria essas 48 linhas
-- (e falharia de qualquer forma, por violar NOT NULL). Corrigido à mão para RENAME COLUMN, que
-- preserva o dado — não é o caso de "coluna obrigatória nova" que exige o padrão de três passos,
-- é uma renomeação simples de coluna já existente.

-- CreateEnum
CREATE TYPE "SupplementOrigin" AS ENUM ('LOJA_SUPLEMENTOS', 'MANIPULADO', 'AMBOS');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('RASCUNHO', 'FINALIZADA', 'SUBSTITUIDA');

-- AlterTable (rename, sem perda de dado)
ALTER TABLE "Supplement" RENAME COLUMN "name" TO "activeName";
DROP INDEX "Supplement_name_key";

-- AlterTable
ALTER TABLE "PlanDelivery" ADD COLUMN     "supplementPrescriptionId" TEXT;

-- AlterTable
ALTER TABLE "Supplement" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "defaultDose" TEXT,
ADD COLUMN     "defaultRoute" TEXT DEFAULT 'Oral',
ADD COLUMN     "defaultTiming" TEXT,
ADD COLUMN     "imageCredit" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "origin" "SupplementOrigin" NOT NULL DEFAULT 'LOJA_SUPLEMENTOS',
ADD COLUMN     "ulNote" TEXT;

-- CreateTable
CREATE TABLE "SupplementBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,

    CONSTRAINT "SupplementBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementProduct" (
    "id" TEXT NOT NULL,
    "supplementId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "presentation" TEXT,
    "flavors" TEXT,
    "doseLabel" TEXT,
    "nutritionJson" JSONB,
    "anvisaRef" TEXT,
    "imageUrl" TEXT,
    "imageCredit" TEXT,
    "imageLicense" TEXT,
    "sourceRef" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SupplementProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundedFormula" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "presentation" TEXT,
    "posology" TEXT,
    "route" TEXT DEFAULT 'Oral',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompoundedFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundedFormulaItem" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "supplementId" TEXT,
    "activeName" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompoundedFormulaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementPrescription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'RASCUNHO',
    "generalNotes" TEXT,
    "pdfUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signatureRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplementPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementPrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "section" "SupplementOrigin" NOT NULL DEFAULT 'LOJA_SUPLEMENTOS',
    "supplementId" TEXT,
    "formulaId" TEXT,
    "displayName" TEXT NOT NULL,
    "acceptedBrands" TEXT,
    "composition" TEXT,
    "route" TEXT NOT NULL DEFAULT 'Oral',
    "posology" TEXT NOT NULL,
    "justification" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discontinuedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupplementPrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplementBrand_name_key" ON "SupplementBrand"("name");

-- CreateIndex
CREATE INDEX "SupplementProduct_supplementId_idx" ON "SupplementProduct"("supplementId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplementProduct_brandId_commercialName_key" ON "SupplementProduct"("brandId", "commercialName");

-- CreateIndex
CREATE INDEX "CompoundedFormulaItem_formulaId_idx" ON "CompoundedFormulaItem"("formulaId");

-- CreateIndex
CREATE INDEX "SupplementPrescription_clientId_date_idx" ON "SupplementPrescription"("clientId", "date");

-- CreateIndex
CREATE INDEX "SupplementPrescriptionItem_prescriptionId_idx" ON "SupplementPrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplement_activeName_key" ON "Supplement"("activeName");

-- AddForeignKey
ALTER TABLE "PlanDelivery" ADD CONSTRAINT "PlanDelivery_supplementPrescriptionId_fkey" FOREIGN KEY ("supplementPrescriptionId") REFERENCES "SupplementPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementProduct" ADD CONSTRAINT "SupplementProduct_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementProduct" ADD CONSTRAINT "SupplementProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "SupplementBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundedFormulaItem" ADD CONSTRAINT "CompoundedFormulaItem_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "CompoundedFormula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundedFormulaItem" ADD CONSTRAINT "CompoundedFormulaItem_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementPrescription" ADD CONSTRAINT "SupplementPrescription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementPrescriptionItem" ADD CONSTRAINT "SupplementPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "SupplementPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementPrescriptionItem" ADD CONSTRAINT "SupplementPrescriptionItem_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementPrescriptionItem" ADD CONSTRAINT "SupplementPrescriptionItem_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "CompoundedFormula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
