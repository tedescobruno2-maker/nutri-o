"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { requestExams } from "@/actions/exams";
import { EXAMS_CATALOG } from "@/lib/examsCatalog";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function RequestExamsModal({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return EXAMS_CATALOG;
    const q = search.trim().toLowerCase();
    return EXAMS_CATALOG.map((g) => ({ ...g, exams: g.exams.filter((e) => e.toLowerCase().includes(q)) })).filter(
      (g) => g.exams.length > 0
    );
  }, [search]);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await requestExams(formData);
      formRef.current?.reset();
      setSelected(new Set());
      setSearch("");
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Solicitar exames
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(0.1 0.02 260 / 0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card glass card-pad animate-in"
            style={{ width: "min(680px, 100%)", maxHeight: "88vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header" style={{ marginBottom: 12 }}>
              <h2>Solicitar exames</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="hidden" name="clientId" value={clientId} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="re-date">Data da solicitação</label>
                  <input className="input" id="re-date" name="requestedDate" type="date" defaultValue={TODAY()} required />
                </div>
                <div className="field">
                  <label htmlFor="re-search">Buscar exame</label>
                  <input
                    className="input"
                    id="re-search"
                    placeholder="Ex: tireoide, vitamina D..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  maxHeight: 320,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {filteredCatalog.length === 0 ? (
                  <p className="text-tertiary" style={{ fontSize: "0.85rem" }}>Nenhum exame encontrado para essa busca.</p>
                ) : (
                  filteredCatalog.map((group) => (
                    <div key={group.category}>
                      <div className="text-tertiary" style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                        {group.category}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {group.exams.map((exam) => (
                          <label key={exam} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              name="examNames"
                              value={exam}
                              checked={selected.has(exam)}
                              onChange={() => toggle(exam)}
                            />
                            {exam}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                {selected.size} exame(s) selecionado(s)
              </div>

              <div className="field">
                <label htmlFor="re-custom">Outro(s) exame(s) — um por linha</label>
                <textarea className="input" id="re-custom" name="customExams" rows={2} placeholder="Ex: Exame X específico" />
              </div>

              <div className="field">
                <label htmlFor="re-notes">Observações (aplicadas a todos os exames desta solicitação)</label>
                <input className="input" id="re-notes" name="notes" placeholder="Opcional" />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 4 }}>
                {isPending ? "Salvando..." : "Solicitar exames selecionados"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
