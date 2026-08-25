"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveGeneratedDocument, getSignedDocumentUrl } from "@/actions/upload";
import { getMealPlanForExport, getProfessionalSettings, getNearestMeasurement } from "@/lib/dal";
import { calculateAge } from "@/lib/utils";
import { mealPlanPdfFileName } from "@/lib/planDisplay";
import { MealPlanDocument, type PdfMeal } from "@/lib/pdf/MealPlanDocument";
import type { MealOptionItemLike } from "@/lib/mealPlanCalc";

export async function generateMealPlanPdf(mealPlanId: string, withPhotos: boolean): Promise<{ url: string; fileName: string }> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const plan = await getMealPlanForExport(mealPlanId);
  if (!plan) throw new Error("Plano não encontrado.");

  const [settings, nutritionist] = await Promise.all([
    getProfessionalSettings(),
    prisma.user.findFirst({ where: { role: "ADMIN_MASTER" } }),
  ]);

  const weight = plan.consultation ? (await getNearestMeasurement(plan.clientId, plan.consultation.date))?.weight ?? null : null;
  const age = plan.client.birthDate ? calculateAge(plan.client.birthDate) : plan.client.age;

  const meals: PdfMeal[] = plan.meals.map((meal) => ({
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

  const initialGuidanceText = plan.initialGuidanceOverride || plan.initialGuidance?.content || null;
  const generatedAt = new Date();

  const buffer = await renderToBuffer(
    <MealPlanDocument
      professional={{
        nutritionistName: settings.nutritionistName,
        crn: settings.crn,
        crnRegion: nutritionist?.crnRegion ?? null,
        logoUrl: settings.logoUrl,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        instagram: settings.instagram,
        footerText: settings.footerText,
      }}
      client={{ name: plan.client.name, age }}
      weight={weight}
      consultationDate={plan.consultation?.date ?? null}
      objective={plan.objective}
      initialGuidanceText={initialGuidanceText}
      generalGuidelines={plan.generalGuidelines}
      meals={meals}
      withPhotos={withPhotos}
      generatedAt={generatedAt}
    />
  );

  const fileName = mealPlanPdfFileName(plan.client.name, generatedAt);
  const objectPath = await saveGeneratedDocument(buffer, `planos/${mealPlanId}`, withPhotos ? "com-fotos.pdf" : "sem-fotos.pdf", "application/pdf");

  await prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: withPhotos ? { pdfUrl: objectPath } : { pdfNoPhotosUrl: objectPath },
  });

  await logAudit({ actorUserId: actor.id, action: "EXPORTAR", entity: "MealPlan", entityId: mealPlanId, clientId: plan.clientId, metadata: { documento: "plano_alimentar_pdf", comFotos: withPhotos } });

  const url = await getSignedDocumentUrl(objectPath);
  if (!url) throw new Error("Não foi possível gerar o link do PDF.");

  return { url, fileName };
}
