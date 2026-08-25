"use client";

import { useState, useTransition } from "react";
import { updateOwnProfile } from "@/actions/account";

type Props = { name: string; crn: string | null; crnRegion: string | null; phone: string | null };

export function ProfileForm({ name, crn, crnRegion, phone }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateOwnProfile(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      <div className="field">
        <label htmlFor="acc-name">Nome completo</label>
        <input className="input" id="acc-name" name="name" required defaultValue={name} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="field">
          <label htmlFor="acc-crn">CRN (número)</label>
          <input className="input" id="acc-crn" name="crn" defaultValue={crn ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="acc-crnRegion">Jurisdição (ex: CRN-4)</label>
          <input className="input" id="acc-crnRegion" name="crnRegion" defaultValue={crnRegion ?? ""} placeholder="CRN-?" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="acc-phone">Telefone</label>
        <input className="input" id="acc-phone" name="phone" defaultValue={phone ?? ""} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar perfil"}
        </button>
        {saved && !isPending && <span className="text-muted" style={{ fontSize: "0.85rem" }}>✓ Salvo</span>}
      </div>
    </form>
  );
}
