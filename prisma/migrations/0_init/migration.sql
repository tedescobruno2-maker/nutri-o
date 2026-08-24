-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "KanbanStatus" AS ENUM ('NOVOS', 'EM_AVALIACAO', 'PLANO_ENTREGUE', 'ACOMPANHAMENTO');

-- CreateEnum
CREATE TYPE "MainGoal" AS ENUM ('EMAGRECIMENTO', 'ESTETICA', 'DESEMPENHO_ESPORTIVO', 'REEDUCACAO_ALIMENTAR', 'ENCAMINHADO_MEDICO');

-- CreateEnum
CREATE TYPE "ConsultationFormStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SOLICITADO', 'RESULTADO_RECEBIDO');

-- CreateEnum
CREATE TYPE "ExamResultFlag" AS ENUM ('NORMAL', 'ATENCAO', 'INDETERMINADO');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTA', 'RETORNO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "GuidanceTextType" AS ENUM ('ORIENTACAO_GERAL', 'HIDRATACAO', 'SUPLEMENTACAO', 'PRE_TREINO', 'TAREFA_INICIAL');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "age" INTEGER,
    "birthDate" TIMESTAMP(3),
    "height" DOUBLE PRECISION,
    "goal" TEXT,
    "document" TEXT,
    "profession" TEXT,
    "notes" TEXT,
    "status" "KanbanStatus" NOT NULL DEFAULT 'NOVOS',
    "order" INTEGER NOT NULL DEFAULT 0,
    "avatarSeed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "resultDate" TIMESTAMP(3),
    "status" "ExamStatus" NOT NULL DEFAULT 'SOLICITADO',
    "notes" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "referenceMin" DOUBLE PRECISION,
    "referenceMax" DOUBLE PRECISION,
    "referenceText" TEXT,
    "flag" "ExamResultFlag" NOT NULL DEFAULT 'INDETERMINADO',
    "sourceFileUrl" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTA',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'AGENDADO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION NOT NULL,
    "bodyFat" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "fatMassKg" DOUBLE PRECISION,
    "subcutaneousFatKg" DOUBLE PRECISION,
    "fatFreeMassKg" DOUBLE PRECISION,
    "muscleMassPercent" DOUBLE PRECISION,
    "bodyWaterPercent" DOUBLE PRECISION,
    "bodyWaterKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "sarcopeniaIndex" DOUBLE PRECISION,
    "boneMassKg" DOUBLE PRECISION,
    "bmr" INTEGER,
    "visceralFat" INTEGER,
    "bioScore" DOUBLE PRECISION,
    "segmental" JSONB,
    "source" TEXT,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "adherence" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,

    CONSTRAINT "DietLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "defaultUnit" TEXT NOT NULL DEFAULT 'g',
    "imageUrl" TEXT,
    "kcal100" DOUBLE PRECISION NOT NULL,
    "protein100" DOUBLE PRECISION NOT NULL,
    "carbs100" DOUBLE PRECISION NOT NULL,
    "fat100" DOUBLE PRECISION NOT NULL,
    "fiber100" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodId" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Plano Alimentar',
    "objective" TEXT,
    "generalGuidelines" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealOption" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Opção 1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "freeText" TEXT NOT NULL,

    CONSTRAINT "MealOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealOptionItem" (
    "id" TEXT NOT NULL,
    "mealOptionId" TEXT NOT NULL,
    "foodId" TEXT,
    "recipeId" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MealOptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSupplement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "supplementId" TEXT,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discontinuedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSupplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationForm" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ConsultationFormStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "fullName" TEXT,
    "document" TEXT,
    "profession" TEXT,
    "height" DOUBLE PRECISION,
    "birthDate" TIMESTAMP(3),
    "mainGoal" "MainGoal",
    "hasNutritionalFollowUp" BOOLEAN,
    "pathology" TEXT,
    "doesPhysicalActivity" BOOLEAN,
    "physicalActivityFrequency" TEXT,
    "medications" TEXT,
    "sleepQuality" TEXT,
    "gutHealth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nutritionistName" TEXT NOT NULL DEFAULT 'Luana Gois',
    "crn" TEXT NOT NULL DEFAULT '09100683',
    "logoUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "footerText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidanceText" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "GuidanceTextType" NOT NULL DEFAULT 'ORIENTACAO_GERAL',
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidanceText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consultation_clientId_idx" ON "Consultation"("clientId");

-- CreateIndex
CREATE INDEX "Exam_clientId_idx" ON "Exam"("clientId");

-- CreateIndex
CREATE INDEX "ExamResult_clientId_idx" ON "ExamResult"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_clientId_parameterName_collectedAt_key" ON "ExamResult"("clientId", "parameterName", "collectedAt");

-- CreateIndex
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Measurement_clientId_idx" ON "Measurement"("clientId");

-- CreateIndex
CREATE INDEX "DietLog_clientId_idx" ON "DietLog"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_foodId_idx" ON "RecipeIngredient"("foodId");

-- CreateIndex
CREATE INDEX "MealPlan_clientId_idx" ON "MealPlan"("clientId");

-- CreateIndex
CREATE INDEX "Meal_mealPlanId_idx" ON "Meal"("mealPlanId");

-- CreateIndex
CREATE INDEX "MealOption_mealId_idx" ON "MealOption"("mealId");

-- CreateIndex
CREATE INDEX "MealOptionItem_mealOptionId_idx" ON "MealOptionItem"("mealOptionId");

-- CreateIndex
CREATE INDEX "MealOptionItem_foodId_idx" ON "MealOptionItem"("foodId");

-- CreateIndex
CREATE INDEX "MealOptionItem_recipeId_idx" ON "MealOptionItem"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplement_name_key" ON "Supplement"("name");

-- CreateIndex
CREATE INDEX "ClientSupplement_clientId_idx" ON "ClientSupplement"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationForm_token_key" ON "ConsultationForm"("token");

-- CreateIndex
CREATE INDEX "ConsultationForm_clientId_idx" ON "ConsultationForm"("clientId");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietLog" ADD CONSTRAINT "DietLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOption" ADD CONSTRAINT "MealOption_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOptionItem" ADD CONSTRAINT "MealOptionItem_mealOptionId_fkey" FOREIGN KEY ("mealOptionId") REFERENCES "MealOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOptionItem" ADD CONSTRAINT "MealOptionItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealOptionItem" ADD CONSTRAINT "MealOptionItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSupplement" ADD CONSTRAINT "ClientSupplement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSupplement" ADD CONSTRAINT "ClientSupplement_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationForm" ADD CONSTRAINT "ConsultationForm_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

