-- Resposta às pendências 9.3 e 9.12 (<<DECISÃO BRUNO>>) — assinatura da nutricionista nos PDFs e
-- sugestão de gramatura de medida caseira por IA. Puramente aditiva.

-- AlterEnum
ALTER TYPE "NutrientSource" ADD VALUE 'IA_ESTIMADA';

-- AlterTable
ALTER TABLE "ProfessionalSettings" ADD COLUMN     "signatureUrl" TEXT;
