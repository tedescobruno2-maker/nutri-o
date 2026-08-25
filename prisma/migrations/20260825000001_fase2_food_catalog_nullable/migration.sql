-- CreateEnum
CREATE TYPE "NutrientSource" AS ENUM ('TACO', 'IBGE_POF', 'USDA', 'ROTULO', 'MANUAL', 'IMPORTADO_PENDENTE');

-- CreateEnum
CREATE TYPE "NutrientStatus" AS ENUM ('VALIDADO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "FoodPreparation" AS ENUM ('NAO_APLICA', 'CRU', 'COZIDO', 'ASSADO', 'GRELHADO', 'REFOGADO', 'FRITO', 'MEXIDO', 'OMELETE', 'PURE', 'VAPOR', 'DESIDRATADO', 'EM_PO');

-- DropIndex
DROP INDEX "Food_name_key";

-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aliases" TEXT,
ADD COLUMN     "baseName" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "imageCredit" TEXT,
ADD COLUMN     "nutrientStatus" "NutrientStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "parentFoodId" TEXT,
ADD COLUMN     "preparation" "FoodPreparation" NOT NULL DEFAULT 'NAO_APLICA',
ADD COLUMN     "sodium100" DOUBLE PRECISION,
ADD COLUMN     "source" "NutrientSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "kcal100" DROP NOT NULL,
ALTER COLUMN "protein100" DROP NOT NULL,
ALTER COLUMN "carbs100" DROP NOT NULL,
ALTER COLUMN "fat100" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MealOptionItem" ADD COLUMN     "choiceGroupId" TEXT,
ADD COLUMN     "foodMeasureId" TEXT;

-- CreateTable
CREATE TABLE "FoodMeasure" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "source" "NutrientSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FoodMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "defaultQuantity" DOUBLE PRECISION,
    "defaultUnit" TEXT,
    "quantityText" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChoiceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceGroupItem" (
    "id" TEXT NOT NULL,
    "choiceGroupId" TEXT NOT NULL,
    "foodId" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChoiceGroupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodMeasure_foodId_idx" ON "FoodMeasure"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodMeasure_foodId_label_key" ON "FoodMeasure"("foodId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "ChoiceGroup_name_key" ON "ChoiceGroup"("name");

-- CreateIndex
CREATE INDEX "ChoiceGroupItem_choiceGroupId_idx" ON "ChoiceGroupItem"("choiceGroupId");

-- CreateIndex
CREATE INDEX "ChoiceGroupItem_foodId_idx" ON "ChoiceGroupItem"("foodId");

-- CreateIndex
CREATE INDEX "Food_parentFoodId_idx" ON "Food"("parentFoodId");

-- CreateIndex
CREATE INDEX "Food_category_idx" ON "Food"("category");

-- CreateIndex
CREATE INDEX "Food_baseName_idx" ON "Food"("baseName");

-- CreateIndex
CREATE UNIQUE INDEX "GuidanceText_content_key" ON "GuidanceText"("content");

-- CreateIndex
CREATE INDEX "MealOptionItem_foodMeasureId_idx" ON "MealOptionItem"("foodMeasureId");

-- CreateIndex
CREATE INDEX "MealOptionItem_choiceGroupId_idx" ON "MealOptionItem"("choiceGroupId");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_parentFoodId_fkey" FOREIGN KEY ("parentFoodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodMeasure" ADD CONSTRAINT "FoodMeasure_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceGroupItem" ADD CONSTRAINT "ChoiceGroupItem_choiceGroupId_fkey" FOREIGN KEY ("choiceGroupId") REFERENCES "ChoiceGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceGroupItem" ADD CONSTRAINT "ChoiceGroupItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOptionItem" ADD CONSTRAINT "MealOptionItem_foodMeasureId_fkey" FOREIGN KEY ("foodMeasureId") REFERENCES "FoodMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOptionItem" ADD CONSTRAINT "MealOptionItem_choiceGroupId_fkey" FOREIGN KEY ("choiceGroupId") REFERENCES "ChoiceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

