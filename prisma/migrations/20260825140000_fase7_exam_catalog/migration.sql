-- Fase 7 do plano mestre — catálogo de parâmetros de exame + faixa de referência por paciente.
-- Migração puramente aditiva: nenhuma coluna obrigatória nova, nenhum rename — não precisa do
-- padrão de três passos.

-- AlterTable
ALTER TABLE "ExamResult" ADD COLUMN     "effectiveFlag" "ExamResultFlag",
ADD COLUMN     "flagSource" TEXT,
ADD COLUMN     "parameterId" TEXT;

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "inputBytes" INTEGER,
    "outputTokens" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamParameter" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" TEXT,
    "unit" TEXT,
    "category" TEXT,
    "defaultMin" DOUBLE PRECISION,
    "defaultMax" DOUBLE PRECISION,
    "defaultText" TEXT,
    "higherIsWorse" BOOLEAN,
    "notes" TEXT,

    CONSTRAINT "ExamParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientExamReference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "refMin" DOUBLE PRECISION,
    "refMax" DOUBLE PRECISION,
    "refText" TEXT,
    "reason" TEXT,
    "setByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientExamReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExamParameter_canonicalName_key" ON "ExamParameter"("canonicalName");

-- CreateIndex
CREATE INDEX "ClientExamReference_clientId_idx" ON "ClientExamReference"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientExamReference_clientId_parameterId_key" ON "ClientExamReference"("clientId", "parameterId");

-- CreateIndex
CREATE INDEX "ExamResult_parameterId_idx" ON "ExamResult"("parameterId");

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "ExamParameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientExamReference" ADD CONSTRAINT "ClientExamReference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientExamReference" ADD CONSTRAINT "ClientExamReference_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "ExamParameter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
