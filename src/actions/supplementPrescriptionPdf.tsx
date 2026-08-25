"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveGeneratedDocument, getSignedDocumentUrl } from "@/actions/upload";
import { getSupplementPrescriptionForExport, getProfessionalSettings } from "@/lib/dal";
import { supplementPrescriptionPdfFileName } from "@/lib/planDisplay";
import { SupplementPrescriptionDocument, type PdfPrescriptionItem } from "@/lib/pdf/SupplementPrescriptionDocument";

export async function generateSupplementPrescriptionPdf(prescriptionId: string): Promise<{ url: string; fileName: string }> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const prescription = await getSupplementPrescriptionForExport(prescriptionId);
  if (!prescription) throw new Error("Prescrição não encontrada.");

  const [settings, nutritionist] = await Promise.all([
    getProfessionalSettings(),
    prisma.user.findFirst({ where: { role: "ADMIN_MASTER" } }),
  ]);

  // Justificativa de uso nunca sai no PDF do paciente (5.6.2 ponto 4) — fica só no prontuário.
  const items: PdfPrescriptionItem[] = prescription.items
    .filter((i) => i.active)
    .map((i) => ({
      id: i.id,
      section: i.section,
      displayName: i.displayName,
      composition: i.composition,
      route: i.route,
      posology: i.posology,
    }));

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
      client={{ name: prescription.client.name }}
      date={prescription.date}
      version={prescription.version}
      items={items}
    />
  );

  const fileName = supplementPrescriptionPdfFileName(prescription.client.name, prescription.date);
  const objectPath = await saveGeneratedDocument(buffer, `suplementos/${prescriptionId}`, "prescricao.pdf", "application/pdf");

  await prisma.supplementPrescription.update({ where: { id: prescriptionId }, data: { pdfUrl: objectPath } });

  await logAudit({ actorUserId: actor.id, action: "EXPORTAR", entity: "SupplementPrescription", entityId: prescriptionId, clientId: prescription.clientId, metadata: { documento: "prescricao_suplementos_pdf" } });

  const url = await getSignedDocumentUrl(objectPath);
  if (!url) throw new Error("Não foi possível gerar o link do PDF.");

  return { url, fileName };
}
