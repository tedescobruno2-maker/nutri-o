"use client";

import { useState } from "react";
import { DeleteFoodButton } from "@/components/foods/DeleteFoodButton";
import { FoodMeasuresManager } from "@/components/foods/FoodMeasuresManager";
import { FOOD_PREPARATION_LABELS, NUTRIENT_SOURCE_LABELS } from "@/lib/utils";
import type { getFoodsGrouped } from "@/lib/dal";

type FoodGroup = Awaited<ReturnType<typeof getFoodsGrouped>>[number];
type Variant = FoodGroup["variants"][number];

function MacroLine({ food }: { food: Variant }) {
  if (food.nutrientStatus === "PENDENTE") {
    return <p className="text-tertiary" style={{ fontSize: "0.76rem" }}>Sem valor nutricional confirmado.</p>;
  }
  return (
    <p className="text-muted" style={{ fontSize: "0.78rem" }}>
      {food.kcal100 ?? "—"} kcal · P {food.protein100 ?? "—"}g · C {food.carbs100 ?? "—"}g · G {food.fat100 ?? "—"}g
    </p>
  );
}

export function FoodCard({ group }: { group: FoodGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { representative, variants } = group;
  const hasPending = variants.some((v) => v.nutrientStatus === "PENDENTE");
  const hasVariants = variants.length > 1;

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {representative.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={representative.imageUrl}
            alt={representative.baseName}
            style={{ width: 48, height: 48, borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-primary-soft)",
              display: "grid",
              placeItems: "center",
              fontSize: "1.3rem",
              flexShrink: 0,
            }}
          >
            🥕
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.92rem" }}>{group.baseName}</strong>
            {hasPending && (
              <span
                title="Alimento sem valor nutricional confirmado — não entra no somatório calórico"
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "var(--danger)",
                  background: "var(--danger-soft, oklch(0.6 0.2 25 / 0.15))",
                  padding: "2px 6px",
                  borderRadius: 999,
                }}
              >
                PENDENTE
              </span>
            )}
          </div>
          <p className="text-tertiary" style={{ fontSize: "0.74rem" }}>
            {representative.category || "Sem categoria"} · {NUTRIENT_SOURCE_LABELS[representative.source] ?? representative.source}
            {representative.brand ? ` · ${representative.brand}` : ""}
          </p>
        </div>
      </div>

      {!hasVariants ? (
        <>
          <MacroLine food={representative} />
          <FoodMeasuresManager foodId={representative.id} measures={representative.measures} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DeleteFoodButton foodId={representative.id} />
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded((v) => !v)}
            style={{ alignSelf: "flex-start" }}
          >
            {expanded ? "Ocultar" : `Ver ${variants.length} preparos`}
          </button>
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              {variants.map((v) => (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600 }}>{FOOD_PREPARATION_LABELS[v.preparation] ?? v.preparation}</p>
                    <MacroLine food={v} />
                    <FoodMeasuresManager foodId={v.id} measures={v.measures} />
                  </div>
                  <DeleteFoodButton foodId={v.id} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
