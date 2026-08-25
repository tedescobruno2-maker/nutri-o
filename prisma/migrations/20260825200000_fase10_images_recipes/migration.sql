-- Fase 10 do plano mestre — biblioteca de imagens (5.11/3.8, construída retroativamente aqui) +
-- receita com macro calculado (5.10.1). Puramente aditiva — "isExtra" é NOT NULL mas tem DEFAULT.

-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('PIXABAY', 'UPLOAD_NUTRICIONISTA', 'CEDIDA_FABRICANTE', 'GERADA_IA', 'OUTRA');

-- AlterTable
ALTER TABLE "Food" ADD COLUMN     "imageAssetId" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "imageAssetId" TEXT,
ADD COLUMN     "isExtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legacyMacrosNote" TEXT,
ADD COLUMN     "mealCategory" TEXT,
ADD COLUMN     "prepTimeMin" INTEGER;

-- AlterTable
ALTER TABLE "MealOption" ADD COLUMN     "imageAssetId" TEXT;

-- AlterTable
ALTER TABLE "Supplement" ADD COLUMN     "imageAssetId" TEXT;

-- AlterTable
ALTER TABLE "SupplementProduct" ADD COLUMN     "imageAssetId" TEXT;

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "source" "ImageSource" NOT NULL,
    "sourceRef" TEXT,
    "sourcePageUrl" TEXT,
    "author" TEXT,
    "license" TEXT,
    "altText" TEXT,
    "searchTerm" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixabaySearchCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixabaySearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImageAsset_source_idx" ON "ImageAsset"("source");

-- CreateIndex
CREATE INDEX "ImageAsset_searchTerm_idx" ON "ImageAsset"("searchTerm");

-- CreateIndex
CREATE UNIQUE INDEX "PixabaySearchCache_query_key" ON "PixabaySearchCache"("query");

-- CreateIndex
CREATE INDEX "PixabaySearchCache_fetchedAt_idx" ON "PixabaySearchCache"("fetchedAt");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOption" ADD CONSTRAINT "MealOption_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplement" ADD CONSTRAINT "Supplement_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementProduct" ADD CONSTRAINT "SupplementProduct_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
