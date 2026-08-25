-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_nutritionistId_fkey";

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "nutritionistId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

