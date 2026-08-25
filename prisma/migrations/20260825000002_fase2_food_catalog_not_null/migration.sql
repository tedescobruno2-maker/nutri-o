-- DropIndex
DROP INDEX "Food_baseName_idx";

-- AlterTable
ALTER TABLE "Food" ALTER COLUMN "baseName" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Food_baseName_preparation_brand_key" ON "Food"("baseName", "preparation", "brand");

