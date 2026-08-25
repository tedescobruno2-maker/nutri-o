"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveGeneratedDocument, getSignedDocumentUrl } from "@/actions/upload";
import { getMealPlanForExport, getProfessionalSettings, getNearestMeasurement } from "@/lib/dal";
import { dbForPatient } from "@/lib/dbPatient";
import { calculateAge } from "@/lib/utils";
import { mealPlanPdfFileName } from "@/lib/planDisplay";
import { MealPlanDocument, type PdfMeal } from "@/lib/pdf/MealPlanDocument";
import type { MealOptionItemLike } from "@/lib/mealPlanCalc";

type RenderMealPlanPdfParams = {
  mealPlanId: string;
  clientId: string;
  clientName: string;
  clientAge: number | null;
  weight: number | null;
  consultationDate: Date | null;
  objective: string | null;
  initialGuidanceText: string | null;
  generalGuidelines: string | null;
  meals: PdfMeal[];
  withPhotos: boolean;
  actorUserId: string | null;
};

/** Núcleo compartilhado entre a geração pela nutricionista (`generateMealPlanPdf`) e pelo
 * paciente no portal (`generateMealPlanPdfForPatient`, Fase 8) — quem chama já autorizou o
 * acesso ao plano (via `requireRole` ou via `dbForPatient`, escopado pela própria sessão). */
async function renderAndSaveMealPlanPdf(params: RenderMealPlanPdfParams): Promise<{ url: string; fileName: string }> {
  const [settings, nutritionist] = await Promise.all([
    getProfessionalSettings(),
    prisma.user.findFirst({ where: { role: "ADMIN_MASTER" } }),
  ]);

  const generatedAt = new Date();

  const buffer = await renderToBuffer(
    <MealPlanDocument
      professional={{
        nutritionistName: settings.nutritionistName,
        profession: nutritionist?.profession ?? null,
        crn: settings.crn,
        crnRegion: nutritionist?.crnRegion ?? null,
        logoUrl: settings.logoUrl,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        instagram: settings.instagram,
        footerText: settings.footerText,
      }}
      client={{ name: params.clientName, age: params.clientAge }}
      weight={params.weight}
      consultationDate={params.consultationDate}
      objective={params.objective}
      initialGuidanceText={params.initialGuidanceText}
      generalGuidelines={params.generalGuidelines}
      meals={params.meals}
      withPhotos={params.withPhotos}
      generatedAt={generatedAt}
    />
  );

  const fileName = mealPlanPdfFileName(params.clientName, generatedAt);
  const objectPath = await saveGeneratedDocument(buffer, `planos/${params.mealPlanId}`, params.withPhotos ? "com-fotos.pdf" : "sem-fotos.pdf", "application/pdf");

  await prisma.mealPlan.update({
    where: { id: params.mealPlanId },
    data: params.withPhotos ? { pdfUrl: objectPath } : { pdfNoPhotosUrl: objectPath },
  });

  await logAudit({
    actorUserId: params.actorUserId,
    action: "EXPORTAR",
    entity: "MealPlan",
    entityId: params.mealPlanId,
    clientId: params.clientId,
    metadata: { documento: "plano_alimentar_pdf", comFotos: params.withPhotos },
  });

  const url = await getSignedDocumentUrl(objectPath);
  if (!url) throw new Error("Não foi possível gerar o link do PDF.");

  return { url, fileName };
}

function toPdfMeals(meals: Array<{
  id: string; name: string; displayTitle: string | null; blockType: string; separator: string; visible: boolean;
  options: Array<{ id: string; label: string; isStructured: boolean; freeText: string; items: unknown[] }>;
}>): PdfMeal[] {
  return meals.map((meal) => ({
    id: meal.id,
    name: meal.name,
    displayTitle: meal.displayTitle,
    blockType: meal.blockType,
    separator: meal.separator,
    visible: meal.visible,
    options: meal.options.map((option) => ({
      id: option.id,
      label: option.label,
      isStructured: option.isStructured,
      freeText: option.freeText,
      items: option.items as unknown as MealOptionItemLike[],
    })),
  }));
}

export async function generateMealPlanPdf(mealPlanId: string, withPhotos: boolean): Promise<{ url: string; fileName: string }> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const plan = await getMealPlanForExport(mealPlanId);
  if (!plan) throw new Error("Plano não encontrado.");

  const weight = plan.consultation ? (await getNearestMeasurement(plan.clientId, plan.consultation.date))?.weight ?? null : null;
  const age = plan.client.birthDate ? calculateAge(plan.client.birthDate) : plan.client.age;

  return renderAndSaveMealPlanPdf({
    mealPlanId,
    clientId: plan.clientId,
    clientName: plan.client.name,
    clientAge: age,
    weight,
    consultationDate: plan.consultation?.date ?? null,
    objective: plan.objective,
    initialGuidanceText: plan.initialGuidanceOverride || plan.initialGuidance?.content || null,
    generalGuidelines: plan.generalGuidelines,
    meals: toPdfMeals(plan.meals),
    withPhotos,
    actorUserId: actor.id,
  });
}

/** Versão do portal (5.8.1: "/portal/plano ... botão Baixar PDF") — o paciente só pode gerar o
 * PDF do PRÓPRIO plano ativo, resolvido inteiramente pela sessão via `dbForPatient`. */
export async function generateMealPlanPdfForPatient(mealPlanId: string, withPhotos: boolean): Promise<{ url: string; fileName: string }> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) throw new Error("Sessão de paciente inválida.");

  const [plan, client] = await Promise.all([
    dbForPatient(sessionUser.clientId).getPlanById(mealPlanId),
    dbForPatient(sessionUser.clientId).getClient(),
  ]);
  if (!plan || !client) throw new Error("Plano não encontrado.");

  const weight = plan.consultation
    ? (await dbForPatient(sessionUser.clientId).getNearestMeasurement(plan.consultation.date))?.weight ?? null
    : null;
  const age = client.birthDate ? calculateAge(client.birthDate) : client.age;

  return renderAndSaveMealPlanPdf({
    mealPlanId,
    clientId: sessionUser.clientId,
    clientName: client.name,
    clientAge: age,
    weight,
    consultationDate: plan.consultation?.date ?? null,
    objective: plan.objective,
    initialGuidanceText: plan.initialGuidanceOverride || plan.initialGuidance?.content || null,
    generalGuidelines: plan.generalGuidelines,
    meals: toPdfMeals(plan.meals),
    withPhotos,
    actorUserId: sessionUser.id,
  });
}
