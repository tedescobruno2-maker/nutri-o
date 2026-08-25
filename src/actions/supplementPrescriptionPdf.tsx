"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveGeneratedDocument, getSignedDocumentUrl } from "@/actions/upload";
import { getSupplementPrescriptionForExport, getProfessionalSettings } from "@/lib/dal";
import { dbForPatient } from "@/lib/dbPatient";
import { supplementPrescriptionPdfFileName } from "@/lib/planDisplay";
import { SupplementPrescriptionDocument, type PdfPrescriptionItem } from "@/lib/pdf/SupplementPrescriptionDocument";

type RenderPrescriptionPdfParams = {
  prescriptionId: string;
  clientId: string;
  clientName: string;
  date: Date;
  version: number;
  items: PdfPrescriptionItem[];
  actorUserId: string | null;
};

/** Núcleo compartilhado entre a geração pela nutricionista e pelo paciente no portal (Fase 8).
 * Justificativa de uso nunca entra em `items` (filtrada por quem chama) — nunca sai no PDF do
 * paciente (5.6.2 ponto 4), fica só no prontuário. */
async function renderAndSaveSupplementPrescriptionPdf(params: RenderPrescriptionPdfParams): Promise<{ url: string; fileName: string }> {
  const [settings, nutritionist] = await Promise.all([
    getProfessionalSettings(),
    prisma.user.findFirst({ where: { role: "ADMIN_MASTER" } }),
  ]);

  const buffer = await renderToBuffer(
    <SupplementPrescriptionDocument
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
      }}
      client={{ name: params.clientName }}
      date={params.date}
      version={params.version}
      items={params.items}
    />
  );

  const fileName = supplementPrescriptionPdfFileName(params.clientName, params.date);
  const objectPath = await saveGeneratedDocument(buffer, `suplementos/${params.prescriptionId}`, "prescricao.pdf", "application/pdf");

  await prisma.supplementPrescription.update({ where: { id: params.prescriptionId }, data: { pdfUrl: objectPath } });

  await logAudit({
    actorUserId: params.actorUserId,
    action: "EXPORTAR",
    entity: "SupplementPrescription",
    entityId: params.prescriptionId,
    clientId: params.clientId,
    metadata: { documento: "prescricao_suplementos_pdf" },
  });

  const url = await getSignedDocumentUrl(objectPath);
  if (!url) throw new Error("Não foi possível gerar o link do PDF.");

  return { url, fileName };
}

export async function generateSupplementPrescriptionPdf(prescriptionId: string): Promise<{ url: string; fileName: string }> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const prescription = await getSupplementPrescriptionForExport(prescriptionId);
  if (!prescription) throw new Error("Prescrição não encontrada.");

  const items: PdfPrescriptionItem[] = prescription.items
    .filter((i) => i.active)
    .map((i) => ({ id: i.id, section: i.section, displayName: i.displayName, composition: i.composition, route: i.route, posology: i.posology }));

  return renderAndSaveSupplementPrescriptionPdf({
    prescriptionId,
    clientId: prescription.clientId,
    clientName: prescription.client.name,
    date: prescription.date,
    version: prescription.version,
    items,
    actorUserId: actor.id,
  });
}

/** Versão do portal (5.8.1: "/portal/suplementos") — o paciente só pode gerar o PDF da PRÓPRIA
 * prescrição finalizada, resolvida inteiramente pela sessão via `dbForPatient`. */
export async function generateSupplementPrescriptionPdfForPatient(prescriptionId: string): Promise<{ url: string; fileName: string }> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) throw new Error("Sessão de paciente inválida.");

  const prescription = await dbForPatient(sessionUser.clientId).getPrescriptionById(prescriptionId);
  if (!prescription) throw new Error("Prescrição não encontrada.");

  const client = await dbForPatient(sessionUser.clientId).getClient();
  if (!client) throw new Error("Paciente não encontrado.");

  const items: PdfPrescriptionItem[] = prescription.items.map((i) => ({
    id: i.id,
    section: i.section,
    displayName: i.displayName,
    composition: i.composition,
    route: i.route,
    posology: i.posology,
  }));

  return renderAndSaveSupplementPrescriptionPdf({
    prescriptionId,
    clientId: sessionUser.clientId,
    clientName: client.name,
    date: prescription.date,
    version: prescription.version,
    items,
    actorUserId: sessionUser.id,
  });
}
