-- Fase 9 do plano mestre — agendamento e reagendamento (3.6).
-- "cancellationDeadlineHours" é NOT NULL mas tem DEFAULT — não precisa do padrão de três passos
-- (a tabela Appointment está vazia em produção hoje, e mesmo com linhas o Postgres preenche o
-- default sozinho numa coluna NOT NULL com DEFAULT, ao contrário de uma sem default).

-- CreateEnum
CREATE TYPE "RescheduleStatus" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO_PELO_PACIENTE');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "AppointmentRescheduleRequest" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "alternativeAt" TIMESTAMP(3),
    "reason" TEXT,
    "status" "RescheduleStatus" NOT NULL DEFAULT 'PENDENTE',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentRescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentRescheduleRequest_appointmentId_idx" ON "AppointmentRescheduleRequest"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentRescheduleRequest_status_createdAt_idx" ON "AppointmentRescheduleRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AppointmentRescheduleRequest" ADD CONSTRAINT "AppointmentRescheduleRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
