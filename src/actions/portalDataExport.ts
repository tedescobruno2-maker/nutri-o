"use server";

import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { dbForPatient } from "@/lib/dbPatient";
import { saveGeneratedDocument, getSignedDocumentUrl } from "@/actions/upload";
import { itemDisplayLabel, itemQuantityLabel } from "@/lib/planDisplay";
import { formatDate, calculateAge } from "@/lib/utils";
import type { MealOptionItemLike } from "@/lib/mealPlanCalc";

/**
 * Portabilidade (LGPD Art. 18, V — 5.8.1 "/portal/meus-dados"): o paciente baixa a própria pasta
 * de dados em JSON, formato interoperável e legível por máquina. Só passa por `dbForPatient`
 * (mesma allowlist do resto do portal) — nunca inclui o que o paciente não pode ver (5.8.3):
 * notas clínicas, justificativa de suplemento, motivo de ajuste de faixa de exame, auditoria.
 */
export async function exportMyData(): Promise<{ url: string; fileName: string }> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.clientId) throw new Error("Sessão de paciente inválida.");

  const db = dbForPatient(sessionUser.clientId);
  const [client, activePlan, planHistory, measurements, dietLogs, examGroups, prescriptions, appointments] = await Promise.all([
    db.getClient(),
    db.getActivePlan(),
    db.getPlanHistory(),
    db.getMeasurements(),
    db.getDietLogs(),
    db.getExamResultsGrouped(),
    db.getPrescriptions(),
    db.getAppointments(),
  ]);
  if (!client) throw new Error("Paciente não encontrado.");

  function planToPortable(plan: NonNullable<typeof activePlan>) {
    return {
      titulo: plan.title,
      objetivo: plan.objective,
      refeicoes: plan.meals
        .filter((m) => m.visible)
        .map((meal) => ({
          nome: meal.displayTitle || meal.name,
          opcoes: meal.options.map((option) => ({
            rotulo: option.label,
            itens: option.isStructured
              ? option.items.map((item) => {
                  const i = item as unknown as MealOptionItemLike;
                  const qty = itemQuantityLabel(i);
                  return qty ? `${qty} de ${itemDisplayLabel(i)}` : itemDisplayLabel(i);
                })
              : [option.freeText],
          })),
        })),
    };
  }

  const data = {
    geradoEm: new Date().toISOString(),
    paciente: {
      nome: client.name,
      dataNascimento: client.birthDate ? formatDate(client.birthDate) : null,
      idade: client.birthDate ? calculateAge(client.birthDate) : client.age,
      altura: client.height,
      objetivo: client.goal,
      email: client.email,
      telefone: client.phone,
      alergias: client.allergies,
      intolerancias: client.intolerances,
      restricoesAlimentares: client.dietaryRestrictions,
      aversõesAlimentares: client.foodAversions,
    },
    planoAtivo: activePlan ? planToPortable(activePlan) : null,
    historicoDePlanos: planHistory.map((p) => ({
      titulo: p.title,
      objetivo: p.objective,
      ativo: p.active,
      criadoEm: formatDate(p.createdAt),
    })),
    medidas: measurements.map((m) => ({
      data: formatDate(m.date),
      pesoKg: m.weight,
      percentualGordura: m.bodyFat,
      percentualMassaMuscular: m.muscleMassPercent,
      imc: m.bmi,
    })),
    adesaoDieta: dietLogs.map((d) => ({
      semana: formatDate(d.weekStart),
      adesaoPercent: d.adherence,
      proteinaG: d.protein,
      carboidratoG: d.carbs,
      gorduraG: d.fat,
    })),
    exames: examGroups.map((p) => ({
      parametro: p.parameterName,
      unidade: p.unit,
      ultimoValor: p.latest.value,
      ultimaColeta: formatDate(p.latest.collectedAt),
      faixaDoLaudo: p.referenceText,
      sinalizacao: p.flag,
      historico: p.points.map((pt) => ({ data: formatDate(pt.collectedAt), valor: pt.value })),
    })),
    suplementos: prescriptions.map((rx) => ({
      versao: rx.version,
      data: formatDate(rx.date),
      itens: rx.items.map((item) => ({
        secao: item.section,
        nome: item.displayName,
        marcasAceitas: item.acceptedBrands,
        composicao: item.composition,
        via: item.route,
        posologia: item.posology,
      })),
    })),
    proximosAgendamentos: appointments.map((a) => ({
      data: formatDate(a.scheduledAt),
      tipo: a.type,
      status: a.status,
    })),
  };

  const buffer = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
  const fileName = `meus-dados_${new Date().toISOString().slice(0, 10)}.json`;
  const objectPath = await saveGeneratedDocument(buffer, `meus-dados/${sessionUser.clientId}`, fileName, "application/json");

  await logAudit({
    actorUserId: sessionUser.id,
    action: "EXPORTAR",
    entity: "Client",
    entityId: sessionUser.clientId,
    clientId: sessionUser.clientId,
    metadata: { documento: "portabilidade_dados_paciente" },
  });

  const url = await getSignedDocumentUrl(objectPath);
  if (!url) throw new Error("Não foi possível gerar o link de download.");

  return { url, fileName };
}
