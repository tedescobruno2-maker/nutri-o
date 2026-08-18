"use client";

import { useRef, useState, useTransition } from "react";
import { createFood } from "@/actions/foods";
import { suggestFoodData } from "@/actions/foodAI";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function NewFoodButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState(false);

  function resetAll() {
    setName("");
    setCategory("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
    setAiImageUrl(null);
    setSuggestError(null);
    setSuggested(false);
    formRef.current?.reset();
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createFood(formData);
      resetAll();
      setOpen(false);
    });
  }

  function handleSuggest() {
    if (!name.trim()) return;
    setSuggestError(null);
    startSuggesting(async () => {
      const fd = new FormData();
      fd.set("name", name);
      const result = await suggestFoodData(fd);
      if (!result.ok) {
        setSuggestError(result.error);
        return;
      }
      setCategory(result.data.category);
      setKcal(String(round1(result.data.kcal100)));
      setProtein(String(round1(result.data.protein100)));
      setCarbs(String(round1(result.data.carbs100)));
      setFat(String(round1(result.data.fat100)));
      if (result.data.fiber100 != null) setFiber(String(round1(result.data.fiber100)));
      setAiImageUrl(result.data.imageUrl);
      setSuggested(true);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Novo alimento
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => { setOpen(false); resetAll(); }}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>Novo alimento</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => { setOpen(false); resetAll(); }}>✕</button>
            </div>

            <form ref={formRef} action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="hidden" name="aiImageUrl" value={aiImageUrl ?? ""} />

              <div className="field">
                <label htmlFor="f-name">Nome</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    id="f-name"
                    name="name"
                    required
                    placeholder="Ex: Peito de frango"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleSuggest}
                    disabled={!name.trim() || isSuggesting}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {isSuggesting ? "Buscando..." : "🤖 Preencher com IA"}
                  </button>
                </div>
                {suggestError && <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 4 }}>{suggestError}</p>}
              </div>

              <div className="field">
                <label htmlFor="f-photo">Foto {aiImageUrl ? "(sugerida pela IA — envie um arquivo para trocar)" : "(opcional)"}</label>
                {aiImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={aiImageUrl} alt={name} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", objectFit: "cover", marginBottom: 8 }} />
                )}
                <input className="input" id="f-photo" name="photo" type="file" accept="image/*" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-category">Categoria</label>
                  <input className="input" id="f-category" name="category" placeholder="Ex: Proteína" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-unit">Unidade padrão</label>
                  <input className="input" id="f-unit" name="defaultUnit" defaultValue="g" placeholder="g, ml, unidade..." />
                </div>
              </div>
              <p className="text-tertiary" style={{ fontSize: "0.76rem" }}>
                Valores nutricionais por 100g (ou 100ml){suggested ? " — sugeridos pela IA, confira antes de salvar:" : ":"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-kcal">Kcal</label>
                  <input className="input" id="f-kcal" name="kcal100" type="number" step="0.1" min={0} required value={kcal} onChange={(e) => setKcal(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-protein">Proteína (g)</label>
                  <input className="input" id="f-protein" name="protein100" type="number" step="0.1" min={0} required value={protein} onChange={(e) => setProtein(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-carbs">Carbo (g)</label>
                  <input className="input" id="f-carbs" name="carbs100" type="number" step="0.1" min={0} required value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-fat">Gordura (g)</label>
                  <input className="input" id="f-fat" name="fat100" type="number" step="0.1" min={0} required value={fat} onChange={(e) => setFat(e.target.value)} />
                </div>
              </div>
              {fiber && <input type="hidden" name="fiber100" value={fiber} />}

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : "Adicionar alimento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
