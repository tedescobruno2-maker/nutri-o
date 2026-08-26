"use client";

import { useState } from "react";
import { FoodsView } from "@/components/foods/FoodsView";
import { RecipesView } from "@/components/recipes/RecipesView";
import { GuidanceTextsView } from "@/components/settings/GuidanceTextsView";
import { SupplementsView } from "@/components/suplementos/SupplementsView";
import type { getFoodsGrouped, getSupplementCatalog } from "@/lib/dal";
import type { RecipeForEdit } from "@/components/recipes/RecipeModal";
import type { Food, GuidanceText } from "@/generated/prisma/client";

const TABS = [
  { key: "recipes", label: "🍽️ Receitas" },
  { key: "foods", label: "🥕 Alimentos" },
  { key: "texts", label: "📚 Textos" },
  { key: "supplements", label: "💊 Suplementos" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/** Painel colapsável com os 4 catálogos usados pra montar um plano — todos já editáveis aqui
 * mesmo (Fases 1-3), sem precisar sair da tela do plano pra corrigir/cadastrar algo (Fase 4). */
export function PlanCatalogPanel({
  foodGroups,
  foods,
  recipes,
  texts,
  supplementCatalog,
}: {
  foodGroups: Awaited<ReturnType<typeof getFoodsGrouped>>;
  foods: Food[];
  recipes: RecipeForEdit[];
  texts: GuidanceText[];
  supplementCatalog: Awaited<ReturnType<typeof getSupplementCatalog>>;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("recipes");

  return (
    <div className="card card-pad">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <span>📖 Catálogos (receitas, alimentos, textos, suplementos)</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={tab === t.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "recipes" && <RecipesView recipes={recipes} foods={foods} />}
          {tab === "foods" && <FoodsView groups={foodGroups} />}
          {tab === "texts" && <GuidanceTextsView texts={texts} />}
          {tab === "supplements" && <SupplementsView {...supplementCatalog} />}
        </div>
      )}
    </div>
  );
}
