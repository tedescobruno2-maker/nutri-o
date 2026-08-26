"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveGeneratedDocument, getSignedDocumentUrl } from "@/actions/upload";
import { getClientForExamsExport, getProfessionalSettings } from "@/lib/dal";
import { ExamRequestDocument } from "@/lib/pdf/ExamRequestDocument";

/** Substitui a versão em HTML/impressão (9.12 pede assinatura no rodapé, e impressão de
 * navegador não garante repetição de rodapé nem paginação — mesmo racional do D6 já aplicado ao
 * plano alimentar e à prescrição de suplementos). */
export async function generateExamRequestPdf(clientId: string): Promise<{ url: string; fileName: string }> {
  const actor = await requireRole("ADMIN_MASTER", "NUTRICIONISTA");

  const [client, settings, nutritionist] = await Promise.all([
    getClientForExamsExport(clientId),
    getProfessionalSettings(),
    prisma.user.findFirst({ where: { role: "ADMIN_MASTER" } }),
  ]);
  if (!client) throw new Error("Paciente não encontrado.");

  const requested = client.exams.filter((e) => e.status === "SOLICITADO").map((e) => ({ id: e.id, name: e.name, notes: e.notes, resultDate: null }));
  const withResult = client.exams.filter((e) => e.status !== "SOLICITADO").map((e) => ({ id: e.id, name: e.name, notes: e.notes, resultDate: e.resultDate }));
  const generatedAt = new Date();

  const buffer = await renderToBuffer(
    <ExamRequestDocument
      professional={{
        nutritionistName: settings.nutritionistName,
        profession: nutritionist?.profession ?? null,
        crn: settings.crn,
        crnRegion: nutritionist?.crnRegion ?? null,
        logoUrl: settings.logoUrl,
        signatureUrl: settings.signatureUrl,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        instagram: settings.instagram,
      }}
      client={{ name: client.name }}
      generatedAt={generatedAt}
      requested={requested}
      withResult={withResult}
    />
  );

  const fileName = `SolicitacaoExames_${client.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "")}_${generatedAt.toISOString().slice(0, 10)}.pdf`;
  const objectPath = await saveGeneratedDocument(buffer, `exames/${clientId}`, "solicitacao.pdf", "application/pdf");

  await logAudit({ actorUserId: actor.id, action: "EXPORTAR", entity: "Exam", entityId: clientId, clientId, metadata: { documento: "solicitacao_exames_pdf" } });

  const url = await getSignedDocumentUrl(objectPath);
  if (!url) throw new Error("Não foi possível gerar o link do PDF.");

  return { url, fileName };
}
