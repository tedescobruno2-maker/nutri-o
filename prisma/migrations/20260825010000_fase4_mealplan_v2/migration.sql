-- CreateEnum
CREATE TYPE "MealBlockType" AS ENUM ('AO_ACORDAR', 'DESJEJUM', 'COLACAO', 'PRE_TREINO', 'INTRA_TREINO', 'POS_TREINO', 'ALMOCO', 'SOBREMESA', 'LANCHE_TARDE', 'JANTAR_LANCHE', 'CEIA', 'HIDRATACAO', 'TAREFAS_INICIAIS', 'RECEITAS_EXTRAS', 'LIVRE');

-- CreateEnum
CREATE TYPE "BlockSeparator" AS ENUM ('OU', 'LISTA');

-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('RASCUNHO', 'FINALIZADO', 'SUBSTITUIDO');

-- CreateEnum
CREATE TYPE "PlanItemType" AS ENUM ('ALIMENTO', 'RECEITA', 'GRUPO_ESCOLHA', 'TEXTO_LIVRE', 'SUPLEMENTO');

-- CreateEnum
CREATE TYPE "CalcStatus" AS ENUM ('CALCULADO', 'PARCIAL', 'FAIXA', 'NAO_CALCULAVEL');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('SISTEMA', 'WHATSAPP', 'EMAIL', 'IMPRESSO');

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "blockType" "MealBlockType" NOT NULL DEFAULT 'LIVRE',
ADD COLUMN     "calcStatus" "CalcStatus" NOT NULL DEFAULT 'NAO_CALCULAVEL',
ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "displayTitle" TEXT,
ADD COLUMN     "kcalMax" DOUBLE PRECISION,
ADD COLUMN     "kcalMin" DOUBLE PRECISION,
ADD COLUMN     "separator" "BlockSeparator" NOT NULL DEFAULT 'OU',
ADD COLUMN     "suggestedTime" TEXT,
ADD COLUMN     "visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MealOption" ADD COLUMN     "calcStatus" "CalcStatus" NOT NULL DEFAULT 'NAO_CALCULAVEL',
ADD COLUMN     "carbsMax" DOUBLE PRECISION,
ADD COLUMN     "carbsMin" DOUBLE PRECISION,
ADD COLUMN     "fatMax" DOUBLE PRECISION,
ADD COLUMN     "fatMin" DOUBLE PRECISION,
ADD COLUMN     "isStructured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kcalMax" DOUBLE PRECISION,
ADD COLUMN     "kcalMin" DOUBLE PRECISION,
ADD COLUMN     "proteinMax" DOUBLE PRECISION,
ADD COLUMN     "proteinMin" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "MealOptionItem" ADD COLUMN     "calcNote" TEXT,
ADD COLUMN     "calcStatus" "CalcStatus" NOT NULL DEFAULT 'NAO_CALCULAVEL',
ADD COLUMN     "carbs" DOUBLE PRECISION,
ADD COLUMN     "fat" DOUBLE PRECISION,
ADD COLUMN     "itemType" "PlanItemType" NOT NULL DEFAULT 'TEXTO_LIVRE',
ADD COLUMN     "kcal" DOUBLE PRECISION,
ADD COLUMN     "literalText" TEXT,
ADD COLUMN     "protein" DOUBLE PRECISION,
ADD COLUMN     "quantityMax" DOUBLE PRECISION,
ADD COLUMN     "quantityText" TEXT,
ADD COLUMN     "showPhoto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN     "calcStatus" "CalcStatus" NOT NULL DEFAULT 'NAO_CALCULAVEL',
ADD COLUMN     "calcWarnings" JSONB,
ADD COLUMN     "carbsTotalMax" DOUBLE PRECISION,
ADD COLUMN     "carbsTotalMin" DOUBLE PRECISION,
ADD COLUMN     "consultationId" TEXT,
ADD COLUMN     "fatTotalMax" DOUBLE PRECISION,
ADD COLUMN     "fatTotalMin" DOUBLE PRECISION,
ADD COLUMN     "finalNotes" TEXT,
ADD COLUMN     "initialGuidanceId" TEXT,
ADD COLUMN     "initialGuidanceOverride" TEXT,
ADD COLUMN     "kcalTotalMax" DOUBLE PRECISION,
ADD COLUMN     "kcalTotalMin" DOUBLE PRECISION,
ADD COLUMN     "pdfNoPhotosUrl" TEXT,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "proteinTotalMax" DOUBLE PRECISION,
ADD COLUMN     "proteinTotalMin" DOUBLE PRECISION,
ADD COLUMN     "signatureRef" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MealPlanStatus" NOT NULL DEFAULT 'RASCUNHO',
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "MealPlanTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "description" TEXT,
    "structure" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDelivery" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT,
    "clientId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "sentByUserId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PlanDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanDelivery_clientId_sentAt_idx" ON "PlanDelivery"("clientId", "sentAt");

-- CreateIndex
CREATE INDEX "MealPlan_clientId_status_idx" ON "MealPlan"("clientId", "status");

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_initialGuidanceId_fkey" FOREIGN KEY ("initialGuidanceId") REFERENCES "GuidanceText"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDelivery" ADD CONSTRAINT "PlanDelivery_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

