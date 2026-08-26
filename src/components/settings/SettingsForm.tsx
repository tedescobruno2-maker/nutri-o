"use client";

import { useState, useTransition } from "react";
import { updateProfessionalSettings } from "@/actions/settings";
import type { ProfessionalSettings } from "@/generated/prisma/client";

export function SettingsForm({ settings }: { settings: ProfessionalSettings }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateProfessionalSettings(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      <div className="field">
        <label htmlFor="nutritionistName">Nome completo</label>
        <input className="input" id="nutritionistName" name="nutritionistName" required defaultValue={settings.nutritionistName} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field">
          <label htmlFor="crn">CRN</label>
          <input className="input" id="crn" name="crn" required defaultValue={settings.crn} />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone</label>
          <input className="input" id="phone" name="phone" defaultValue={settings.phone ?? ""} placeholder="(00) 00000-0000" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="address">Endereço</label>
        <input className="input" id="address" name="address" defaultValue={settings.address ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="instagram">Instagram</label>
        <input className="input" id="instagram" name="instagram" defaultValue={settings.instagram ?? ""} placeholder="@usuario" />
      </div>

      <div className="field">
        <label htmlFor="footerText">Texto adicional no rodapé do PDF</label>
        <textarea className="input" id="footerText" name="footerText" rows={2} defaultValue={settings.footerText ?? ""} placeholder="Opcional" />
      </div>

      <div className="field">
        <label htmlFor="logo">Logo (opcional)</label>
        {settings.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="Logo atual" style={{ height: 48, marginBottom: 8, objectFit: "contain" }} />
        )}
        <input className="input" id="logo" name="logo" type="file" accept="image/*" />
      </div>

      <div className="field">
        <label htmlFor="signature">Assinatura (opcional)</label>
        {settings.signatureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.signatureUrl} alt="Assinatura atual" style={{ height: 48, marginBottom: 8, objectFit: "contain" }} />
        )}
        <input className="input" id="signature" name="signature" type="file" accept="image/*" />
        <p className="text-tertiary" style={{ fontSize: "0.76rem", marginTop: 4 }}>
          Envie uma foto ou scan da sua assinatura, de preferência com fundo transparente ou branco — aparece no
          rodapé do plano alimentar, da prescrição de suplementos e da solicitação de exames. Isto é uma assinatura
          visual/simples, não a assinatura eletrônica avançada exigida por lei para valer como documento oficial
          sozinha (Art. 14 da Lei 14.063/2020) — essa parte segue pendente de decisão sua sobre qual provedor usar.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar configurações"}
        </button>
        {saved && !isPending && <span className="text-muted" style={{ fontSize: "0.85rem" }}>✓ Salvo</span>}
      </div>
    </form>
  );
}
