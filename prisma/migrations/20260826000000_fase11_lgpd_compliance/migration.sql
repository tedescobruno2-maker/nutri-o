-- Fase 11 do plano mestre — conformidade LGPD/CFN (3.7, 6.2 blocos A/E/H). Puramente aditiva.

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('TUTELA_SAUDE', 'TELENUTRICAO', 'USO_IA_EXAMES', 'IMAGEM_DIVULGACAO', 'MARKETING', 'PESQUISA');

-- CreateEnum
CREATE TYPE "SubjectRequestType" AS ENUM ('ACESSO', 'CORRECAO', 'PORTABILIDADE', 'ELIMINACAO', 'REVOGACAO', 'INFO_COMPARTILHAMENTO');

-- CreateEnum
CREATE TYPE "SubjectRequestStatus" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'ATENDIDA', 'RECUSADA_FUNDAMENTADA');

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "viaTic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "textVersion" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "SubjectRequestType" NOT NULL,
    "status" "SubjectRequestStatus" NOT NULL DEFAULT 'ABERTA',
    "description" TEXT,
    "responseText" TEXT,
    "responseFileUrl" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consent_clientId_purpose_idx" ON "Consent"("clientId", "purpose");

-- CreateIndex
CREATE INDEX "SubjectRequest_status_dueAt_idx" ON "SubjectRequest"("status", "dueAt");

-- CreateIndex
CREATE INDEX "SubjectRequest_clientId_idx" ON "SubjectRequest"("clientId");

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectRequest" ADD CONSTRAINT "SubjectRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
