-- CreateEnum
CREATE TYPE "PortalAccessScope" AS ENUM ('COMPLETO', 'SOMENTE_PLANO');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "portalAccessScope" "PortalAccessScope" NOT NULL DEFAULT 'COMPLETO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaEverConfiguredAt" TIMESTAMP(3);
