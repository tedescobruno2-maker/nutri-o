"use client";

import { useRef, useState, useTransition } from "react";
import { addExam, deleteExam, markExamResult } from "@/actions/exams";
import { formatDateFull } from "@/lib/utils";

type ExamItem = {
  id: string;
  name: string;
  requestedDate: Date | string;
  resultDate: Date | string | null;
  status: string;
  notes: string | null;
  fileUrl: string | null;
};

function AddExamForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addExam(formData);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        + Solicitar exame
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="animate-in"
      style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto auto", gap: 10, alignItems: "end", margin: "12px 0" }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div className="field">
        <label htmlFor="ex-name">Exame</label>
        <input className="input" id="ex-name" name="name" required placeholder="Ex: Hemograma completo" />
      </div>
      <div className="field">
        <label htmlFor="ex-date">Data solicitação</label>
        <input className="input" id="ex-date" name="requestedDate" type="date" required />
      </div>
      <div className="field">
        <label htmlFor="ex-notes">Observações</label>
        <input className="input" id="ex-notes" name="notes" placeholder="Opcional" />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}

function ExamRow({ exam, clientId }: { exam: ExamItem; clientId: string }) {
  const [openResult, setOpenResult] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await markExamResult(formData);
      formRef.current?.reset();
      setOpenResult(false);
    });
  }

  const received = exam.status === "RESULTADO_RECEBIDO";

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{exam.name}</div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
            Solicitado em {formatDateFull(exam.requestedDate)}
            {received && exam.resultDate ? ` · Resultado em ${formatDateFull(exam.resultDate)}` : ""}
            {exam.notes ? ` · ${exam.notes}` : ""}
          </div>
          {exam.fileUrl && (
            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="text-muted" style={{ fontSize: "0.8rem" }}>
              📎 Ver resultado anexado
            </a>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`badge ${received ? "badge-primary" : "badge-warm"}`}>
            {received ? "Resultado recebido" : "Solicitado"}
          </span>
          {!received && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenResult((v) => !v)}>
              Anexar resultado
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startTransition(() => deleteExam(exam.id, clientId))}
          >
            ✕
          </button>
        </div>
      </div>

      {openResult && (
        <form
          ref={formRef}
          action={handleSubmit}
          className="animate-in"
          style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: 10, alignItems: "end", marginTop: 10 }}
        >
          <input type="hidden" name="examId" value={exam.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <div className="field">
            <label htmlFor={`r-date-${exam.id}`}>Data do resultado</label>
            <input className="input" id={`r-date-${exam.id}`} name="resultDate" type="date" required />
          </div>
          <div className="field">
            <label htmlFor={`r-notes-${exam.id}`}>Observações</label>
            <input className="input" id={`r-notes-${exam.id}`} name="notes" placeholder="Opcional" />
          </div>
          <div className="field">
            <label htmlFor={`r-file-${exam.id}`}>Arquivo (PDF/imagem)</label>
            <input className="input" id={`r-file-${exam.id}`} name="file" type="file" accept="application/pdf,image/*" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
            {isPending ? "Salvando..." : "Confirmar"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ExamsSection({ clientId, exams }: { clientId: string; exams: ExamItem[] }) {
  return (
    <div className="card card-pad">
      <div className="chart-card-header">
        <h3>Exames solicitados</h3>
        <AddExamForm clientId={clientId} />
      </div>

      {exams.length === 0 ? (
        <p className="text-tertiary" style={{ fontSize: "0.85rem", marginTop: 8 }}>Nenhum exame solicitado ainda.</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          {exams.map((exam) => (
            <ExamRow key={exam.id} exam={exam} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}
