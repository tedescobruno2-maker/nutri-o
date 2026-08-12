import { notFound } from "next/navigation";
import { getConsultationFormByToken } from "@/lib/dal";
import { ConsultationFormClient } from "@/components/consultation/ConsultationFormClient";

export default async function ConsultationFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await getConsultationFormByToken(token);
  if (!form) notFound();

  if (form.status === "COMPLETED") {
    return (
      <div className="public-card card glass card-pad animate-in success-state">
        <span style={{ fontSize: "2.4rem" }}>🌱</span>
        <h1>Obrigada, {form.client.name.split(" ")[0]}!</h1>
        <p className="text-muted">
          Recebemos suas respostas. Nos vemos na consulta — até breve!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="public-header animate-in">
        <div className="brand-mark" style={{ marginBottom: 8 }}>🥗</div>
        <h1>Nosso dia da consulta está chegando</h1>
        <p className="text-muted">
          Olá, {form.client.name.split(" ")[0]}! Gostaria de te conhecer um pouco mais antes da nossa consulta.
          Por favor, responda e envie até um dia antes.
        </p>
      </div>
      <ConsultationFormClient token={token} defaultName={form.client.name} />
    </>
  );
}
