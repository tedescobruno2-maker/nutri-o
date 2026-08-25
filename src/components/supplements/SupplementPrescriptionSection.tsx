"use client";

import { useState, useTransition } from "react";
import { addPrescriptionItem, removePrescriptionItem, discontinuePrescriptionItem, reactivatePrescriptionItem, finalizePrescription } from "@/actions/supplementPrescriptions";
import { generateSupplementPrescriptionPdf } from "@/actions/supplementPrescriptionPdf";
import { formatDateFull } from "@/lib/utils";

type SupplementOption = {
  id: string;
  activeName: string;
  category: string | null;
  origin: "LOJA_SUPLEMENTOS" | "MANIPULADO" | "AMBOS";
  defaultDose: string | null;
  defaultTiming: string | null;
  products: Array<{ brand: { name: string } }>;
};

type PrescriptionItem = {
  id: string;
  section: "LOJA_SUPLEMENTOS" | "MANIPULADO" | "AMBOS";
  displayName: string;
  acceptedBrands: string | null;
  composition: string | null;
  route: string;
  posology: string;
  justification: string | null;
  active: boolean;
  discontinuedAt: Date | null;
};

type Prescription = {
  id: string;
  version: number;
  status: "RASCUNHO" | "FINALIZADA" | "SUBSTITUIDA";
  date: Date;
  pdfUrl: string | null;
  items: PrescriptionItem[];
};

const SECTION_LABELS: Record<string, string> = {
  LOJA_SUPLEMENTOS: "Loja de suplementos",
  MANIPULADO: "Para manipular",
  AMBOS: "Loja de suplementos",
};

function ItemCard({ item, clientId, editable }: { item: PrescriptionItem; clientId: string; editable: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-subtle)",
        opacity: item.active ? 1 : 0.55,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <strong style={{ fontSize: "0.9rem" }}>{item.displayName}</strong>
        {editable && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {item.active ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={isPending}
                onClick={() => startTransition(() => discontinuePrescriptionItem(item.id, clientId))}
              >
                Suspender
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={isPending}
                onClick={() => startTransition(() => reactivatePrescriptionItem(item.id, clientId))}
              >
                Reativar
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={isPending}
              onClick={() => startTransition(() => removePrescriptionItem(item.id, clientId))}
            >
              Remover
            </button>
          </div>
        )}
      </div>
      <span className="text-muted" style={{ fontSize: "0.8rem" }}>
        Via {item.route.toLowerCase()}. {item.posology}
      </span>
      {item.composition && (
        <span className="text-tertiary" style={{ fontSize: "0.76rem" }}>Composição: {item.composition}</span>
      )}
      {!item.active && item.discontinuedAt && (
        <span className="text-tertiary" style={{ fontSize: "0.76rem" }}>Suspenso em {formatDateFull(item.discontinuedAt)}</span>
      )}
    </div>
  );
}

function AddItemForm({ clientId, prescriptionId, supplements }: { clientId: string; prescriptionId?: string; supplements: SupplementOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supplementId, setSupplementId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedBrands, setAcceptedBrands] = useState("");
  const [composition, setComposition] = useState("");
  const [route, setRoute] = useState("Oral");
  const [posology, setPosology] = useState("");
  const [section, setSection] = useState<"LOJA_SUPLEMENTOS" | "MANIPULADO">("LOJA_SUPLEMENTOS");
  const [justification, setJustification] = useState("");

  function handleSelectSupplement(id: string) {
    setSupplementId(id);
    const s = supplements.find((sup) => sup.id === id);
    if (!s) return;
    const brandNames = Array.from(new Set(s.products.map((p) => p.brand.name)));
    const brandsSuggestion = brandNames.length > 0 ? brandNames.join(", ") : "";
    setAcceptedBrands(brandsSuggestion);
    setDisplayName(`${s.activeName.toUpperCase()}${brandsSuggestion ? ` (${brandsSuggestion})` : ""}${s.defaultDose ? ` - ${s.defaultDose}` : ""}`);
    setPosology([s.defaultDose, s.defaultTiming].filter(Boolean).join(", "));
    setSection(s.origin === "MANIPULADO" ? "MANIPULADO" : "LOJA_SUPLEMENTOS");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addPrescriptionItem({
          clientId,
          prescriptionId,
          supplementId: supplementId || undefined,
          section,
          displayName,
          acceptedBrands,
          composition,
          route,
          posology,
          justification,
        });
        setSupplementId("");
        setDisplayName("");
        setAcceptedBrands("");
        setComposition("");
        setRoute("Oral");
        setPosology("");
        setJustification("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao adicionar item.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="no-print" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={supplementId} onChange={(e) => handleSelectSupplement(e.target.value)} className="input" style={{ flex: 1, minWidth: 220 }}>
          <option value="">Buscar ativo (opcional)...</option>
          {supplements.map((s) => (
            <option key={s.id} value={s.id}>
              {s.activeName}{s.category ? ` — ${s.category}` : ""}
            </option>
          ))}
        </select>
        <select value={section} onChange={(e) => setSection(e.target.value as "LOJA_SUPLEMENTOS" | "MANIPULADO")} className="input" style={{ width: 180 }}>
          <option value="LOJA_SUPLEMENTOS">Loja de suplementos</option>
          <option value="MANIPULADO">Para manipular</option>
        </select>
      </div>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome de exibição (ex: CREATINA (VITAFOR, NUTRIFY) - 5 g)" className="input" required />
      <input value={acceptedBrands} onChange={(e) => setAcceptedBrands(e.target.value)} placeholder="Marcas aceitas (ex: TRUE SOURCE, VITAFOR)" className="input" />
      <input value={composition} onChange={(e) => setComposition(e.target.value)} placeholder="Composição (opcional)" className="input" />
      <div style={{ display: "flex", gap: 8 }}>
        <input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Via" className="input" style={{ width: 120 }} required />
        <input value={posology} onChange={(e) => setPosology(e.target.value)} placeholder="Posologia (ex: 5 g diluído em água, no café da manhã)" className="input" style={{ flex: 1 }} required />
      </div>
      <textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Justificativa de uso (obrigatória — fica só no prontuário, não sai no PDF do paciente)" className="input" rows={2} required />
      {error && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</span>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending} style={{ alignSelf: "flex-start" }}>
        {isPending ? "Adicionando..." : "+ Adicionar item"}
      </button>
    </form>
  );
}

function GeneratePdfButton({ prescriptionId, label }: { prescriptionId: string; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="no-print" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const result = await generateSupplementPrescriptionPdf(prescriptionId);
              window.open(result.url, "_blank");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Falha ao gerar o PDF.");
            }
          })
        }
      >
        {isPending ? "Gerando PDF..." : label}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
    </span>
  );
}

function FinalizeButton({ prescriptionId, clientId }: { prescriptionId: string; clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="no-print" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await finalizePrescription(prescriptionId, clientId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Falha ao finalizar.");
            }
          })
        }
      >
        {isPending ? "Finalizando..." : "Finalizar prescrição"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.76rem" }}>{error}</span>}
    </span>
  );
}

export function SupplementPrescriptionSection({ clientId, prescriptions, supplements }: { clientId: string; prescriptions: Prescription[]; supplements: SupplementOption[] }) {
  const [showNewForm, setShowNewForm] = useState(false);
  const draft = prescriptions.find((p) => p.status === "RASCUNHO") ?? null;
  const finalized = prescriptions.filter((p) => p.status !== "RASCUNHO");

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="chart-card-header">
        <h3>Suplementação</h3>
        {!draft && (
          <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => setShowNewForm((v) => !v)}>
            {showNewForm ? "Cancelar" : "+ Nova prescrição"}
          </button>
        )}
      </div>

      {prescriptions.length === 0 && !showNewForm && (
        <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhuma prescrição de suplementos ainda.</p>
      )}

      {draft && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="badge badge-warm" style={{ alignSelf: "flex-start" }}>Rascunho</div>
          {draft.items.map((item) => (
            <ItemCard key={item.id} item={item} clientId={clientId} editable />
          ))}
          <AddItemForm clientId={clientId} prescriptionId={draft.id} supplements={supplements} />
          <FinalizeButton prescriptionId={draft.id} clientId={clientId} />
        </div>
      )}

      {showNewForm && !draft && <AddItemForm clientId={clientId} supplements={supplements} />}

      {finalized.map((prescription) => (
        <div key={prescription.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <span className={`badge ${prescription.status === "FINALIZADA" ? "badge-primary" : "badge-muted"}`}>
                {prescription.status === "FINALIZADA" ? "Finalizada" : "Substituída"} · v{prescription.version}
              </span>
              <span className="text-muted" style={{ fontSize: "0.8rem", marginLeft: 8 }}>{formatDateFull(prescription.date)}</span>
            </div>
            <GeneratePdfButton prescriptionId={prescription.id} label="📄 Gerar PDF" />
          </div>
          {Object.entries(SECTION_LABELS)
            .filter(([key], index, arr) => arr.findIndex(([k]) => k === key) === index)
            .filter(([key]) => key !== "AMBOS")
            .map(([sectionKey, sectionLabel]) => {
              const sectionItems = prescription.items.filter((i) => (sectionKey === "LOJA_SUPLEMENTOS" ? i.section !== "MANIPULADO" : i.section === "MANIPULADO"));
              if (sectionItems.length === 0) return null;
              return (
                <div key={sectionKey} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="text-tertiary" style={{ fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase" }}>{sectionLabel}</span>
                  {sectionItems.map((item) => (
                    <ItemCard key={item.id} item={item} clientId={clientId} editable={false} />
                  ))}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
