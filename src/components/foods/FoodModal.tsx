"use client";

import { useRef, useState, useTransition } from "react";
import { createFood, updateFood } from "@/actions/foods";
import { suggestFoodData } from "@/actions/foodAI";
import type { Food } from "@/generated/prisma/client";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function FoodModal({ food, trigger }: { food?: Food; trigger: React.ReactNode }) {
  const isEdit = !!food;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState(food?.name ?? "");
  const [category, setCategory] = useState(food?.category ?? "");
  const [kcal, setKcal] = useState(food?.kcal100 != null ? String(food.kcal100) : "");
  const [protein, setProtein] = useState(food?.protein100 != null ? String(food.protein100) : "");
  const [carbs, setCarbs] = useState(food?.carbs100 != null ? String(food.carbs100) : "");
  const [fat, setFat] = useState(food?.fat100 != null ? String(food.fat100) : "");
  const [fiber, setFiber] = useState(food?.fiber100 != null ? String(food.fiber100) : "");
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState(false);

  function resetAll() {
    if (!isEdit) {
      setName("");
      setCategory("");
      setKcal("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");
    }
    setAiImageUrl(null);
    setSuggestError(null);
    setSuggested(false);
    formRef.current?.reset();
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        formData.set("id", food.id);
        await updateFood(formData);
      } else {
        await createFood(formData);
      }
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
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "oklch(0.1 0.02 260 / 0.45)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
          onClick={() => { setOpen(false); resetAll(); }}
        >
          <div className="card glass card-pad animate-in" style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <h2>{isEdit ? "Editar alimento" : "Novo alimento"}</h2>
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
                <label htmlFor="f-photo">Foto {aiImageUrl ? "(sugerida pela IA — envie um arquivo para trocar)" : isEdit && food?.imageUrl ? "(envie um arquivo para trocar a atual)" : "(opcional)"}</label>
                {aiImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={aiImageUrl} alt={name} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", objectFit: "cover", marginBottom: 8 }} />
                ) : isEdit && food?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={food.imageUrl} alt={name} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", objectFit: "cover", marginBottom: 8 }} />
                ) : null}
                <input className="input" id="f-photo" name="photo" type="file" accept="image/*" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-category">Categoria</label>
                  <input className="input" id="f-category" name="category" placeholder="Ex: Proteína" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-unit">Unidade padrão</label>
                  <input className="input" id="f-unit" name="defaultUnit" defaultValue={food?.defaultUnit ?? "g"} placeholder="g, ml, unidade..." />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-brand">Marca (opcional)</label>
                  <input className="input" id="f-brand" name="brand" defaultValue={food?.brand ?? ""} placeholder="Ex: Danone, Yopro..." />
                </div>
                <div className="field">
                  <label htmlFor="f-source">Fonte do dado nutricional</label>
                  <select className="input" id="f-source" name="source" defaultValue={food?.source === "ROTULO" ? "ROTULO" : "MANUAL"}>
                    <option value="MANUAL">Digitado agora (manual)</option>
                    <option value="ROTULO">Rótulo do produto</option>
                  </select>
                </div>
              </div>
              <p className="text-tertiary" style={{ fontSize: "0.76rem" }}>
                Valores nutricionais por 100g (ou 100ml){suggested ? " — sugeridos pela IA, confira antes de salvar" : ""}. Deixe em
                branco se ainda não souber — o alimento fica marcado como &quot;pendente&quot; e não entra no cálculo do plano até ser
                preenchido.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <div className="field">
                  <label htmlFor="f-kcal">Kcal</label>
                  <input className="input" id="f-kcal" name="kcal100" type="number" step="0.1" min={0} value={kcal} onChange={(e) => setKcal(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-protein">Proteína (g)</label>
                  <input className="input" id="f-protein" name="protein100" type="number" step="0.1" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-carbs">Carbo (g)</label>
                  <input className="input" id="f-carbs" name="carbs100" type="number" step="0.1" min={0} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="f-fat">Gordura (g)</label>
                  <input className="input" id="f-fat" name="fat100" type="number" step="0.1" min={0} value={fat} onChange={(e) => setFat(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-fiber">Fibra (g, opcional)</label>
                <input className="input" id="f-fiber" name="fiber100" type="number" step="0.1" min={0} value={fiber} onChange={(e) => setFiber(e.target.value)} style={{ maxWidth: 140 }} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: 6 }}>
                {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar alimento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
